# Expo App Template

这是一个 React Native + Expo 应用模板，用于快速生成跨平台移动应用。

## 📁 项目结构

```
├── app/                    # Expo Router 路由目录
│   ├── _layout.tsx        # 根布局（Provider 配置）
│   ├── (tabs)/            # Tab 导航组
│   │   ├── _layout.tsx    # Tab 配置
│   │   ├── index.tsx      # 首页
│   │   └── settings.tsx   # 设置页
│   └── +not-found.tsx     # 404 页面
├── constants/             # 常量配置
│   ├── colors.ts          # 颜色主题
│   └── layout.ts          # 布局配置
├── types/                 # TypeScript 类型定义
│   └── index.ts           # 通用类型
├── utils/                 # 工具函数
│   └── storage.ts         # 本地存储工具
├── app.json               # Expo 配置
├── package.json           # 依赖管理
└── tsconfig.json          # TypeScript 配置
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
# 或
bun install
```

### 运行开发服务器

```bash
# 启动开发服务器（本地网络）
npm start

# 启动开发服务器（Tunnel 模式 - 跨网络访问）
npm run start-tunnel

# Web 预览
npm run start-web

# Web 预览（Tunnel 模式）
npm run start-web-tunnel

# iOS 模拟器
npm run ios

# iOS 模拟器（Tunnel 模式）
npm run ios-tunnel

# Android 模拟器
npm run android

# Android 模拟器（Tunnel 模式）
npm run android-tunnel
```

**💡 什么时候使用 Tunnel？**
- 手机和电脑不在同一 WiFi 网络
- 需要在外网测试 App
- 本地网络有防火墙限制
- 需要分享给其他人测试

### ⚠️ 常见启动问题

**问题 1：端口被占用**
```bash
# 解决方案：使用其他端口
expo start --port 8082
```

**问题 2：缓存问题**
```bash
# 清除 Expo 缓存
expo start --clear
```

**问题 3：依赖问题**
```bash
rm -rf node_modules
npm install
```

## 🎯 核心特性

- ✅ **Expo Router**：基于文件的路由系统
- ✅ **TypeScript**：完整的类型支持
- ✅ **React Query**：服务端状态管理
- ✅ **AsyncStorage**：本地数据持久化
- ✅ **Lucide Icons**：现代化图标库
- ✅ **Safe Area Context**：适配刘海屏

## 📝 开发指南

### 添加新页面

在 `app/` 目录下创建新文件即可：

```tsx
// app/profile.tsx
export default function ProfileScreen() {
  return <View><Text>个人资料</Text></View>;
}
```

### 添加新 Tab

编辑 `app/(tabs)/_layout.tsx`：

```tsx
<Tabs.Screen
  name="new-tab"
  options={{
    title: "新标签",
    tabBarIcon: ({ color }) => <Icon color={color} size={24} />,
  }}
/>
```

### 使用本地存储

```tsx
import { storage } from '@/utils/storage';

// 保存数据
await storage.set('key', { data: 'value' });

// 读取数据
const data = await storage.get<DataType>('key');
```

## 🎨 自定义主题

编辑 `constants/colors.ts` 修改颜色配置。

## 📦 构建部署

```bash
# 安装 EAS CLI
npm install -g @expo/eas-cli

# 配置项目
eas build:configure

# 构建 iOS
eas build --platform ios

# 构建 Android
eas build --platform android
```

## 📄 许可证

MIT

