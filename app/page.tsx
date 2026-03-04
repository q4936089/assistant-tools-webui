"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [deployHistory, setDeployHistory] = useState<any[]>([]);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('deployHistory') || '[]');
    setDeployHistory(history);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0a1a] relative overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      {/* 网格背景 */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* 主容器 */}
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header - 品牌区域 */}
        <header className="text-center mb-20 animate-fade-in">
          {/* Logo */}
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-4xl">🚀</span>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl blur opacity-30 -z-10" />
            </div>
          </div>

          {/* 标题 */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              AssistantTools
            </span>
          </h1>
          
          {/* 副标题 */}
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-4 leading-relaxed">
            专业级 Web3 代币发行与管理平台
          </p>
          
          {/* 标签 */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {['一键发币', '批量空投', '自动归集', '代币预售'].map((tag, index) => (
              <span
                key={tag}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 backdrop-blur-sm"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        {/* 功能卡片区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20">
          {/* 发币卡片 - 主要功能 */}
          <Link href="/create-token" className="group animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="card-hover relative h-full bg-gradient-to-br from-[#251b38] to-[#1f1530] rounded-2xl p-8 border border-white/10 overflow-hidden">
              {/* 光效背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* 内容 */}
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🪙</span>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                  一键发币
                </h2>
                
                <p className="text-gray-400 mb-6 leading-relaxed">
                  快速部署 ERC20 代币到 BSC 网络，无需编程知识，3 分钟完成发行
                </p>
                
                {/* 特性标签 */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                    ERC20
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                    BSC
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                    免代码
                  </span>
                </div>
                
                {/* 行动按钮 */}
                <div className="flex items-center text-purple-400 font-medium group-hover:text-purple-300 transition-colors">
                  <span>立即创建</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
              
              {/* 底部光条 */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </div>
          </Link>

          {/* 空投卡片 - 即将上线 */}
          <div className="animate-fade-in h-full bg-[#251b38]/50 rounded-2xl p-8 border border-white/5 relative overflow-hidden" style={{ animationDelay: '0.2s' }}>
            {/* 即将上线标签 */}
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium">
              即将上线
            </div>
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-6 border border-amber-500/20">
              <span className="text-3xl">🎁</span>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">
              批量空投
            </h2>
            
            <p className="text-gray-400 mb-6 leading-relaxed">
              上传 CSV 文件，一键向多个地址发放代币，支持自定义分配比例
            </p>
            
            {/* 进度条 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>开发进度</span>
                <span>75%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* 归集卡片 - 即将上线 */}
          <div className="animate-fade-in h-full bg-[#251b38]/50 rounded-2xl p-8 border border-white/5 relative overflow-hidden md:col-span-2 lg:col-span-1" style={{ animationDelay: '0.3s' }}>
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium">
              即将上线
            </div>
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6 border border-emerald-500/20">
              <span className="text-3xl">💰</span>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">
              自动归集
            </h2>
            
            <p className="text-gray-400 mb-6 leading-relaxed">
              将多个钱包的代币自动归集到主钱包，节省 Gas 费用
            </p>
            
            <div className="flex items-center text-gray-500 text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>敬请期待</span>
            </div>
          </div>

          {/* 预售卡片 - 即将上线 */}
          <div className="animate-fade-in h-full bg-[#251b38]/50 rounded-2xl p-8 border border-white/5 relative overflow-hidden md:col-span-2 lg:col-span-2" style={{ animationDelay: '0.4s' }}>
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium">
              即将上线
            </div>
            
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                <span className="text-3xl">📈</span>
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3">
                  代币预售
                </h2>
                
                <p className="text-gray-400 mb-4 leading-relaxed">
                  创建预售合约，设置价格、硬顶、软顶和时间，支持多种代币购买
                </p>
                
                {/* 功能列表 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['自定义价格', '硬顶/软顶', '白名单', 'KYC 集成', '自动上架', '流动性锁定'].map((feature) => (
                    <div key={feature} className="flex items-center text-sm text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 技术特性区域 */}
        <div className="max-w-5xl mx-auto mb-20 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">技术特性</h2>
            <p className="text-gray-400">安全、透明、高效的 Web3 基础设施</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '⚡', title: 'ethers.js', desc: '基于最新版本' },
              { icon: '🦊', title: 'MetaMask', desc: '官方支持' },
              { icon: '🔗', title: 'BSC 网络', desc: '测试网/主网' },
              { icon: '📦', title: '开源透明', desc: '代码可审计' },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all duration-300 text-center"
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <div className="font-semibold text-white mb-1">{feature.title}</div>
                <div className="text-sm text-gray-500">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 我的部署 */}
        {deployHistory.length > 0 && (
          <div className="max-w-4xl mx-auto mb-20 animate-fade-in" style={{ animationDelay: '0.55s' }}>
            <h2 className="text-2xl font-bold text-white mb-4">📜 我的部署</h2>
            <div className="space-y-3">
              {deployHistory.map((item, index) => (
                <div key={index} className="glass rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{item.name} ({item.symbol})</div>
                      <div className="text-sm text-gray-400 font-mono">{item.contractAddress}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.verified && <span className="text-green-400">✅</span>}
                      <a
                        href={`https://testnet.bscscan.com/token/${item.contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline text-sm font-medium"
                      >
                        查看 →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部信息 */}
        <footer className="text-center py-8 border-t border-white/5 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>当前版本仅支持 BSC 测试网，请确保钱包有测试币</span>
          </div>
          <p className="text-gray-600 text-xs">
            AssistantTools © 2024 · 让 Web3 更简单
          </p>
        </footer>
      </div>
    </div>
  );
}
