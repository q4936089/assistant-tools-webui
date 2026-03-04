"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import Link from "next/link";

// 表单验证 Hook
function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((fields: { name: string; symbol: string; supply: string }) => {
    const newErrors: Record<string, string> = {};

    if (!fields.name || fields.name.trim().length === 0) {
      newErrors.name = "请输入代币名称";
    } else if (fields.name.length > 50) {
      newErrors.name = "名称不能超过 50 个字符";
    }

    if (!fields.symbol || fields.symbol.trim().length === 0) {
      newErrors.symbol = "请输入代币符号";
    } else if (!/^[A-Z]{2,10}$/.test(fields.symbol)) {
      newErrors.symbol = "符号必须是 2-10 位大写字母";
    }

    if (!fields.supply || parseInt(fields.supply) <= 0) {
      newErrors.supply = "请输入有效的供应量";
    } else if (parseInt(fields.supply) > 10000000000) {
      newErrors.supply = "供应量不能超过 100 亿";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return { errors, validate, clearError, setErrors };
}

export default function CreateTokenPage() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState("1000000");
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    success?: boolean;
    contractAddress?: string;
    error?: string;
    verificationStatus?: 'pending' | 'verified' | 'failed';
  } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [verificationTimer, setVerificationTimer] = useState<NodeJS.Timeout | null>(null);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  
  // 高级配置
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [decimals, setDecimals] = useState("18");
  const [mintable, setMintable] = useState(false);
  const [taxRate, setTaxRate] = useState("0");
  const [pausable, setPausable] = useState(false);

  const { errors, validate, clearError } = useFormValidation();

  // 连接钱包
  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      if (typeof window.ethereum === "undefined") {
        throw new Error("请安装 MetaMask 钱包");
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
    } catch (error: any) {
      // 用户拒绝连接不显示错误
      if (error.code !== 4001) {
        alert(`连接失败：${error.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // 部署代币
  const deployToken = async () => {
    if (!account) {
      alert("请先连接钱包");
      return;
    }

    if (!validate({ name, symbol, supply })) {
      return;
    }

    setIsDeploying(true);
    setDeployResult(null);

    try {
      const response = await fetch("/api/deploy-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          symbol,
          initialSupply: supply,
          walletAddress: account,
          decimals: parseInt(decimals),
          mintable,
          taxRate: parseInt(taxRate),
          pausable
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDeployResult({
          success: true,
          contractAddress: result.contractAddress,
          verificationStatus: result.verificationStatus || 'pending',
        });
        setShowSuccessModal(true);

        // 保存部署历史
        saveDeployHistory({
          contractAddress: result.contractAddress,
          name,
          symbol,
          txHash: result.txHash,
          verified: result.verificationStatus === 'verified'
        });

        // 开始轮询验证状态（每 5 秒一次，最多轮询 2 分钟）
        let pollCount = 0;
        const maxPolls = 24; // 2 分钟
        const timer = setInterval(() => {
          pollCount++;
          if (pollCount >= maxPolls) {
            clearInterval(timer);
            setVerificationTimer(null);
          } else {
            pollVerificationStatus(result.contractAddress!);
          }
        }, 5000);
        setVerificationTimer(timer);
      } else {
        setDeployResult({
          success: false,
          error: result.error || "部署失败",
        });
      }
    } catch (error: any) {
      setDeployResult({
        success: false,
        error: error.message || "网络错误",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  // 轮询验证状态
  const pollVerificationStatus = useCallback(async (contractAddress: string) => {
    try {
      const response = await fetch(`/api/deploy-token?address=${contractAddress}`);
      const result = await response.json();

      if (result.success) {
        if (result.verified) {
          setDeployResult(prev => prev ? { ...prev, verificationStatus: 'verified' } : null);
          if (verificationTimer) {
            clearInterval(verificationTimer);
            setVerificationTimer(null);
          }
        } else if (result.status === 'Pending') {
          // 继续轮询
          setDeployResult(prev => prev ? { ...prev, verificationStatus: 'pending' } : null);
        } else {
          // 验证失败
          setDeployResult(prev => prev ? { ...prev, verificationStatus: 'failed' } : null);
          if (verificationTimer) {
            clearInterval(verificationTimer);
            setVerificationTimer(null);
          }
        }
      }
    } catch (error) {
      console.error('轮询验证状态失败:', error);
    }
  }, [verificationTimer]);

  // 获取 Gas 估算
  useEffect(() => {
    async function fetchGasEstimate() {
      try {
        if (typeof window.ethereum !== 'undefined') {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice;
          const estimatedGas = 500000n; // 部署合约约 50 万 Gas
          const totalCost = gasPrice * estimatedGas;
          
          // 转换为 BNB
          const bnbCost = ethers.formatEther(totalCost);
          setGasEstimate(`${parseFloat(bnbCost).toFixed(4)} BNB`);
        }
      } catch (err) {
        console.error('Gas 估算失败:', err);
      }
    }
    
    if (account) {
      fetchGasEstimate();
    }
  }, [account]);

  // 保存部署历史
  const saveDeployHistory = (result: {
    contractAddress: string;
    name: string;
    symbol: string;
    txHash?: string;
    verified?: boolean;
  }) => {
    const history = JSON.parse(localStorage.getItem('deployHistory') || '[]');
    history.unshift({
      ...result,
      timestamp: Date.now(),
      verified: result.verified || false
    });
    // 只保留最近 20 条
    localStorage.setItem('deployHistory', JSON.stringify(history.slice(0, 20)));
  };

  // 重置表单
  const resetForm = () => {
    setName("");
    setSymbol("");
    setSupply("1000000");
    setDeployResult(null);
    setShowSuccessModal(false);
    if (verificationTimer) {
      clearInterval(verificationTimer);
      setVerificationTimer(null);
    }
  };

  // 清理定时器
  useState(() => {
    return () => {
      if (verificationTimer) {
        clearInterval(verificationTimer);
      }
    };
  });

  return (
    <div className="min-h-screen bg-[#0f0a1a] relative overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      {/* 网格背景 */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* 返回按钮 */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors group"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-6 shadow-lg shadow-purple-500/30">
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            一键发币
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            在 BSC 测试网上快速部署你的 ERC20 代币，只需 3 步即可完成
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {[
              { step: 1, title: '连接钱包', icon: '🦊' },
              { step: 2, title: '填写信息', icon: '📝' },
              { step: 3, title: '部署代币', icon: '✨' },
            ].map((item, index, arr) => (
              <div key={item.step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  account 
                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' 
                    : 'bg-white/5 text-gray-500 border border-white/10'
                }`}>
                  <span className="text-sm">{item.icon}</span>
                </div>
                <span className={`ml-2 text-sm hidden md:block ${
                  account ? 'text-white' : 'text-gray-500'
                }`}>
                  {item.title}
                </span>
                {index < arr.length - 1 && (
                  <div className={`w-8 md:w-16 h-0.5 mx-2 ${
                    account ? 'bg-purple-500/50' : 'bg-white/5'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* 连接钱包卡片 */}
          <div className="glass rounded-2xl p-6 border border-white/10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  account 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-white/5 border border-white/10'
                }`}>
                  {account ? (
                    <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <span className="text-2xl">🦊</span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">钱包状态</p>
                  <p className="font-medium text-white">
                    {account
                      ? `${account.slice(0, 6)}...${account.slice(-4)}`
                      : "未连接"}
                  </p>
                  {account && (
                    <p className="text-xs text-green-500 mt-1">● 已连接 BSC 测试网</p>
                  )}
                </div>
              </div>
              <button
                onClick={connectWallet}
                disabled={isConnecting || !!account}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 btn-active ${
                  account
                    ? "bg-green-500/10 text-green-400 border border-green-500/20 cursor-default"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25"
                }`}
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    连接中...
                  </span>
                ) : account ? (
                  "已连接"
                ) : (
                  "连接钱包"
                )}
              </button>
            </div>
          </div>

          {/* 发币表单卡片 */}
          <div className="glass rounded-2xl p-8 border border-white/10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <span className="text-xl">📝</span>
              </div>
              <h2 className="text-xl font-semibold text-white">代币配置</h2>
            </div>

            <div className="space-y-5">
              {/* 名称输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  代币名称 <span className="text-purple-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearError('name');
                    }}
                    placeholder="例如：Assistant Token"
                    className={`w-full px-4 py-3.5 bg-white/5 border rounded-xl text-white placeholder-gray-500 input-focus outline-none transition-all ${
                      errors.name 
                        ? 'border-red-500/50 focus:border-red-500' 
                        : 'border-white/10 focus:border-purple-500 focus:bg-white/10'
                    }`}
                  />
                  {name && !errors.name && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {errors.name && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* 符号输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  代币符号 <span className="text-purple-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value.toUpperCase());
                      clearError('symbol');
                    }}
                    placeholder="例如：ASST"
                    maxLength={10}
                    className={`w-full px-4 py-3.5 bg-white/5 border rounded-xl text-white placeholder-gray-500 input-focus outline-none transition-all font-mono tracking-wider ${
                      errors.symbol 
                        ? 'border-red-500/50 focus:border-red-500' 
                        : 'border-white/10 focus:border-purple-500 focus:bg-white/10'
                    }`}
                  />
                  {symbol && !errors.symbol && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                {errors.symbol && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.symbol}
                  </p>
                )}
              </div>

              {/* 供应量输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  初始供应量 <span className="text-purple-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={supply}
                    onChange={(e) => {
                      setSupply(e.target.value);
                      clearError('supply');
                    }}
                    placeholder="例如：1000000"
                    className={`w-full px-4 py-3.5 bg-white/5 border rounded-xl text-white placeholder-gray-500 input-focus outline-none transition-all font-mono ${
                      errors.supply 
                        ? 'border-red-500/50 focus:border-red-500' 
                        : 'border-white/10 focus:border-purple-500 focus:bg-white/10'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    tokens
                  </div>
                </div>
                {errors.supply && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.supply}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>小数位固定为 18 位，实际供应量 = {supply} × 10^18</span>
                </div>
              </div>

              {/* 快速选择 */}
              <div className="pt-2">
                <p className="text-sm text-gray-400 mb-2">快速选择</p>
                <div className="flex flex-wrap gap-2">
                  {['1,000,000', '10,000,000', '100,000,000', '1,000,000,000'].map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setSupply(value.replace(/,/g, ''));
                        clearError('supply');
                      }}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              {/* 高级选项 */}
              <div className="mt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors"
                >
                  {showAdvanced ? '▼' : '▶'} 高级选项
                </button>
                
                {showAdvanced && (
                  <div className="mt-4 space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    {/* 小数位 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        小数位
                      </label>
                      <input
                        type="number"
                        value={decimals}
                        onChange={(e) => setDecimals(e.target.value)}
                        min="0"
                        max="18"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">通常设为 18</p>
                    </div>
                    
                    {/* 是否可增发 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">可增发</label>
                        <p className="text-xs text-gray-500">允许后续铸造更多代币</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={mintable}
                        onChange={(e) => setMintable(e.target.checked)}
                        className="w-5 h-5 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                    
                    {/* 交易税率 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        交易税率 (%)
                      </label>
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">0-100，0 表示无税</p>
                    </div>
                    
                    {/* 是否可暂停 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">可暂停交易</label>
                        <p className="text-xs text-gray-500">紧急情况下暂停交易</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={pausable}
                        onChange={(e) => setPausable(e.target.checked)}
                        className="w-5 h-5 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 部署按钮 */}
            {gasEstimate && (
              <div className="text-sm text-gray-500 mb-2">
                ⛽ 预计 Gas 费：{gasEstimate}
              </div>
            )}
            <button
              onClick={deployToken}
              disabled={isDeploying || !account}
              className={`w-full mt-8 py-4 rounded-xl font-medium text-white transition-all duration-200 btn-active flex items-center justify-center gap-2 ${
                isDeploying || !account
                  ? "bg-gray-600 cursor-not-allowed opacity-50"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
              }`}
            >
              {isDeploying ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>部署中，请确认钱包交易...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>部署代币</span>
                </>
              )}
            </button>
          </div>

          {/* 部署结果 */}
          {deployResult && !deployResult.success && (
            <div className="glass rounded-2xl p-6 border border-red-500/20 bg-red-500/5 animate-scale-in">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">
                    部署失败
                  </h3>
                  <p className="text-red-300/80 text-sm">{deployResult.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 提示信息 */}
          <div className="glass rounded-2xl p-6 border border-amber-500/20 bg-amber-500/5 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-400 mb-2">
                  部署前请确认
                </h3>
                <ul className="space-y-1 text-sm text-amber-200/70">
                  <li>• 确保钱包已切换到 BSC 测试网</li>
                  <li>• 钱包内有足够的测试 BNB 支付 Gas 费</li>
                  <li>• 代币信息一旦部署无法修改</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 成功弹窗 */}
        {showSuccessModal && deployResult?.success && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass rounded-3xl p-8 max-w-md w-full border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 animate-scale-in">
              {/* 成功图标 */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-white text-center mb-2">
                部署成功！
              </h2>
              <p className="text-gray-400 text-center mb-6">
                你的代币已成功部署到 BSC 测试网
              </p>

              {/* 合约地址 */}
              <div className="bg-black/30 rounded-xl p-4 mb-6 border border-white/10">
                <p className="text-xs text-gray-500 mb-2">合约地址</p>
                <p className="font-mono text-sm text-green-400 break-all">
                  {deployResult.contractAddress}
                </p>
              </div>

              {/* 验证状态 */}
              <div className="mb-6">
                {deployResult.verificationStatus === 'pending' && (
                  <div className="flex items-center justify-center gap-2 text-amber-400">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm">验证中...</span>
                  </div>
                )}
                {deployResult.verificationStatus === 'verified' && (
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">已验证 ✅</span>
                  </div>
                )}
                {deployResult.verificationStatus === 'failed' && (
                  <div className="flex items-center justify-center gap-2 text-red-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">验证失败</span>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="space-y-3">
                <a
                  href={`https://testnet.bscscan.com/token/${deployResult.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-center hover:from-green-500 hover:to-emerald-500 transition-all btn-active block"
                >
                  在 BSCScan 查看 →
                </a>
                <button
                  onClick={resetForm}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all btn-active"
                >
                  创建另一个代币
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
