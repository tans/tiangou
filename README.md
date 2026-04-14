# 🔫 Auto Sniper Bot

**在线访问**: https://tans.github.io/tiangou/

基于 **Astro + Viem + shadcn/ui** 的自动化代币狙击机器人。

## 功能特性

### 🎯 过滤条件
- **TG Bot 检测** - 检测合约是否包含 Telegram 机器人（反 Rug）
- **税率限制** - 买入/卖出税高于设定值则跳过
- **流动性检查** - 初始流动性需达到最低要求
- **Honeypot 检测** - 识别蜜罐代币

### ⚡ 自动狙击
- 监测到新代币立即自动买入
- 可配置买入金额 (ETH)
- 可配置滑点
- MEV 保护选项

### 📊 Dashboard
- 实时监控状态
- 交易历史
- 统计数据
- 参数配置

## 技术栈

- **Frontend**: Astro + React Islands
- **Web3**: Viem + Wagmi
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand

## 开始使用

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 WalletConnect (可选)

编辑 `src/lib/wagmi.ts`，添加你的 WalletConnect Project ID。

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 打开浏览器

访问 `http://localhost:4321`

## 项目结构

```
src/
├── components/
│   ├── ui/              # shadcn/ui 组件
│   ├── Dashboard.tsx    # 主面板
│   ├── WalletButton.tsx
│   ├── TokenMonitor.tsx
│   ├── FilterPanel.tsx
│   └── TransactionTable.tsx
├── lib/
│   ├── sniper-engine.ts # 狙击引擎核心
│   ├── wagmi.ts         # Web3 配置
│   └── utils.ts         # 工具函数
├── store/
│   └── sniper.ts       # Zustand 状态管理
└── pages/
    └── index.astro      # 入口页面
```

## 配置说明

### 过滤条件
| 参数 | 说明 | 默认值 |
|------|------|--------|
| Require TG | 是否要求有 TG 机器人 | false |
| Max Buy Tax | 最大买入税率 (%) | 10% |
| Max Sell Tax | 最大卖出税率 (%) | 10% |
| Min Liquidity | 最低流动性 (ETH) | 0.1 |

### 狙击参数
| 参数 | 说明 | 默认值 |
|------|------|--------|
| Buy Amount | 每次买入金额 (ETH) | 0.01 |
| Slippage | 滑点容忍度 (%) | 5% |
| Auto Snipe | 发现符合条件的代币自动买入 | true |
| MEV Protection | MEV 保护 | true |

## ⚠️ 风险提示

1. **智能合约风险** - 狙击操作涉及直接与合约交互，存在合约漏洞风险
2. **三明治攻击** - 即使开启 MEV 保护也无法完全避免
3. **Honeypot** - 过滤条件仅供参考，无法 100% 保证安全
4. **DYOR** - 请在操作前自行研究代币

## License

MIT
