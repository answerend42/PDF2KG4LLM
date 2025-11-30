import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Save as SaveIcon,
  Build as BuildIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { Settings } from '../types';
import DirectoryPickerDialog from './DirectoryPickerDialog';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rootPath, setRootPath] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [dirPickerOpen, setDirPickerOpen] = useState(false);
  const [dirPickerTarget, setDirPickerTarget] = useState<'input' | 'output' | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [settingsData, rootData] = await Promise.all([
        apiService.getSettings(),
        apiService.getRootPath(),
      ]);
      // 确保至少有 5 个对话模型条目（默认）
      const normalized: any = { ...(settingsData as any) };
      normalized.models = { ...(settingsData.models as any) || {} };

      const models: Record<string, any> = normalized.models;
      const allIds = Object.keys(models || {});
      const chatIds = allIds.filter(id => {
        const m = models[id] || {};
        const t = (m.type || '').toString().toLowerCase();
        return t === 'chat' || id === 'default_chat_model';
      });

      const baseTemplate =
        models.default_chat_model ||
        (chatIds.length > 0 ? models[chatIds[0]] : null) ||
        {
          type: 'chat',
          model_provider: 'openai',
          model: 'gpt-4.1-mini',
          api_base: 'https://api.openai.com/v1',
          api_key: '',
          auth_type: 'api_key',
        };

      let idx = 1;
      while (chatIds.length < 5) {
        const newId = `chat_model_${idx++}`;
        if (models[newId]) continue;
        models[newId] = { ...baseTemplate };
        chatIds.push(newId);
      }

      setSettings(normalized as Settings);
      setRootPath(rootData.root_path || '');
    } catch (error: any) {
      setMessage({ type: 'error', text: `加载设置失败: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      await apiService.updateSettings(settings);
      setMessage({ type: 'success', text: '设置保存成功' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `保存失败: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleBuildIndex = async () => {
    setBuilding(true);
    setMessage(null);

    try {
      await apiService.buildIndex();
      setMessage({ type: 'success', text: '索引构建已开始，这可能需要几分钟时间' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `构建索引失败: ${error.message}` });
    } finally {
      setBuilding(false);
    }
  };

  const updateNestedValue = (path: string[], value: any) => {
    if (!settings) return;

    const newSettings = { ...settings };
    let current: any = newSettings;

    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;
    setSettings(newSettings);
  };

  const handleApplyRootPath = async () => {
    if (!rootPath) {
      setMessage({ type: 'error', text: '根路径不能为空' });
      return;
    }
    setMessage(null);
    try {
      await apiService.updateRootPath(rootPath);
      setMessage({ type: 'success', text: '根路径已更新，已重新加载当前设置' });
      await loadSettings();
    } catch (error: any) {
      setMessage({ type: 'error', text: `更新根路径失败: ${error.message}` });
    }
  };

  const handleOpenDirPicker = (target: 'input' | 'output') => {
    setDirPickerTarget(target);
    setDirPickerOpen(true);
  };

  const handleCloseDirPicker = () => {
    setDirPickerOpen(false);
    setDirPickerTarget(null);
  };

  const handleDirSelected = (path: string) => {
    if (!settings || !dirPickerTarget) return;

    if (dirPickerTarget === 'input') {
      updateNestedValue(['input', 'storage', 'base_dir'], path);
    } else if (dirPickerTarget === 'output') {
      updateNestedValue(['output', 'base_dir'], path);
    }

    handleCloseDirPicker();
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        overflowY: 'auto',
        padding: 4,
        backgroundColor: '#f0f2f5',
      }}
    >
      <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          设置
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {/* Root path configuration */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              数据根目录
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              配置后端使用的数据根路径，例如 <code>graphrag/ragtest</code> 或 <code>graphrag/christmas</code>。
              更改后将影响 settings.yaml、文件浏览器和索引构建。
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                fullWidth
                label="数据根目录（绝对或相对路径，基于仓库根目录）"
                value={rootPath}
                onChange={e => setRootPath(e.target.value)}
                margin="normal"
              />
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleApplyRootPath}
                sx={{ whiteSpace: 'nowrap', mt: '8px' }}
              >
                应用根目录
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Index Building */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              索引管理
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              构建或重建知识图谱索引。这个过程会分析输入文档并生成知识图谱。
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={building ? <CircularProgress size={20} /> : <BuildIcon />}
                onClick={handleBuildIndex}
                disabled={building}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {building ? '构建中...' : '构建索引'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadSettings}
              >
                刷新设置
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Model Settings */}
        {settings?.models && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                模型配置
              </Typography>
              <Divider sx={{ my: 2 }} />

              {/* 聊天模型列表 */}
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                聊天模型
              </Typography>

              {/* 默认聊天模型 ID 选择 */}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    SelectProps={{ native: true }}
                    label="默认聊天模型 ID（用于本地 / 全局搜索与纯对话）"
                    value={
                      settings.local_search?.chat_model_id ||
                      settings.global_search?.chat_model_id ||
                      'default_chat_model'
                    }
                    onChange={e => {
                      const value = e.target.value;
                      updateNestedValue(['local_search', 'chat_model_id'], value);
                      updateNestedValue(['global_search', 'chat_model_id'], value);
                    }}
                    margin="normal"
                    helperText="该 ID 必须是下方对话模型列表中的模型 ID"
                  >
                    {Object.keys(settings.models as any || {}).map(id => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              {/* 可添加 / 删除的对话模型行 */}
              <Box sx={{ mt: 2 }}>
                {Object.entries(settings.models as any)
                  .filter(([id, m]: any) => {
                    const t = (m?.type || '').toString().toLowerCase();
                    return t === 'chat' || id === 'default_chat_model';
                  })
                  .map(([id, model]: any, index) => (
                    <Box
                      key={id}
                      sx={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 2,
                        p: 2,
                        mb: 1.5,
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="模型 ID"
                            value={id}
                            onChange={e => {
                              const newId = e.target.value.trim();
                              if (!newId || newId === id) return;
                              setSettings(prev => {
                                if (!prev) return prev;
                                const next: any = {
                                  ...prev,
                                  models: { ...(prev.models as any) },
                                };
                                if (next.models?.[newId]) return next as Settings;
                                next.models[newId] = next.models[id];
                                delete next.models[id];
                                if (next.local_search?.chat_model_id === id) {
                                  next.local_search.chat_model_id = newId;
                                }
                                if (next.global_search?.chat_model_id === id) {
                                  next.global_search.chat_model_id = newId;
                                }
                                return next as Settings;
                              });
                            }}
                            margin="normal"
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="模型名称"
                            value={model?.model || ''}
                            onChange={e =>
                              updateNestedValue(['models', id, 'model'], e.target.value)
                            }
                            margin="normal"
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="API Base"
                            value={model?.api_base || ''}
                            onChange={e =>
                              updateNestedValue(['models', id, 'api_base'], e.target.value)
                            }
                            margin="normal"
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            type="password"
                            label="API Key"
                            value={model?.api_key || ''}
                            onChange={e =>
                              updateNestedValue(['models', id, 'api_key'], e.target.value)
                            }
                            margin="normal"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              color="error"
                              disabled={Object.keys((settings.models as any) || {}).length <= 1}
                              onClick={() => {
                                setSettings(prev => {
                                  if (!prev) return prev;
                                  const next: any = {
                                    ...prev,
                                    models: { ...(prev.models as any) },
                                  };
                                  delete next.models[id];
                                  if ((next as any).local_search?.chat_model_id === id) {
                                    (next as any).local_search.chat_model_id =
                                      Object.keys(next.models || {})[0] || '';
                                  }
                                  if ((next as any).global_search?.chat_model_id === id) {
                                    (next as any).global_search.chat_model_id =
                                      Object.keys(next.models || {})[0] || '';
                                  }
                                  return next as Settings;
                                });
                              }}
                            >
                              删除该对话模型
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}

                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSettings(prev => {
                        if (!prev) return prev;
                        const next: any = { ...prev, models: { ...prev.models } };
                        const base =
                          next.models.default_chat_model ||
                          Object.values(next.models)[0] ||
                          {
                            type: 'chat',
                            model_provider: 'openai',
                            model: 'gpt-4.1-mini',
                            api_base: 'https://api.openai.com/v1',
                            api_key: '',
                            auth_type: 'api_key',
                          };
                        let idx = 1;
                        let newId = `chat_model_${idx}`;
                        while (next.models[newId]) {
                          idx += 1;
                          newId = `chat_model_${idx}`;
                        }
                        next.models[newId] = { ...base };
                        return next;
                      });
                    }}
                  >
                    添加对话模型
                  </Button>
                </Box>
              </Box>

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                嵌入模型
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="模型名称"
                    value={settings.models.default_embedding_model?.model || ''}
                    onChange={e =>
                      updateNestedValue(
                        ['models', 'default_embedding_model', 'model'],
                        e.target.value
                      )
                    }
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="API Base"
                    value={settings.models.default_embedding_model?.api_base || ''}
                    onChange={e =>
                      updateNestedValue(
                        ['models', 'default_embedding_model', 'api_base'],
                        e.target.value
                      )
                    }
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="API Key（嵌入模型）"
                    value={settings.models.default_embedding_model?.api_key || ''}
                    onChange={e =>
                      updateNestedValue(
                        ['models', 'default_embedding_model', 'api_key'],
                        e.target.value
                      )
                    }
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Input/Output Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              输入/输出配置
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    label="输入目录"
                    value={settings?.input?.storage?.base_dir || ''}
                    onChange={e =>
                      updateNestedValue(['input', 'storage', 'base_dir'], e.target.value)
                    }
                    margin="normal"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleOpenDirPicker('input')}
                    sx={{ whiteSpace: 'nowrap', mt: '8px' }}
                  >
                    浏览…
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    label="输出目录"
                    value={settings?.output?.base_dir || ''}
                    onChange={e => updateNestedValue(['output', 'base_dir'], e.target.value)}
                    margin="normal"
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleOpenDirPicker('output')}
                    sx={{ whiteSpace: 'nowrap', mt: '8px' }}
                  >
                    浏览…
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* UI Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              界面设置
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="对话字体大小（px）"
                  value={settings?.ui?.chat_font_size ?? 15}
                  onChange={e =>
                    updateNestedValue(
                      ['ui', 'chat_font_size'],
                      Number(e.target.value) || 15
                    )
                  }
                  margin="normal"
                  inputProps={{ min: 10, max: 24 }}
                  helperText="影响问答窗口输入与显示的字体大小"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              px: 4,
            }}
          >
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </Box>
      </Box>

      {/* Directory picker for input/output base directories */}
      <DirectoryPickerDialog
        open={dirPickerOpen}
        title={dirPickerTarget === 'input' ? '选择输入目录' : '选择输出目录'}
        initialPath={
          dirPickerTarget === 'input'
            ? settings?.input?.storage?.base_dir || ''
            : dirPickerTarget === 'output'
            ? settings?.output?.base_dir || ''
            : ''
        }
        onClose={handleCloseDirPicker}
        onSelect={handleDirSelected}
      />
    </Box>
  );
};

export default SettingsPage;
