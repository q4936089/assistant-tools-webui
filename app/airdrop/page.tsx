"use client";

import { useState, useRef } from "react";

interface AirdropRecipient {
  address: string;
  amount: string;
}

export default function AirdropPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [recipients, setRecipients] = useState<AirdropRecipient[]>([]);
  const [tokenAddress, setTokenAddress] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    txHash?: string;
    error?: string;
    count?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      alert(`连接失败：${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // 解析 CSV
  const parseCSV = (content: string) => {
    const lines = content.trim().split("\n");
    const parsed: AirdropRecipient[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue; // 跳过空行和注释

      const parts = line.split(",");
      if (parts.length >= 2) {
        parsed.push({
          address: parts[0].trim(),
          amount: parts[1].trim(),
        });
      }
    }

    setRecipients(parsed);
  };

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  // 发送空投
  const sendAirdrop = async () => {
    if (!account) {
      alert("请先连接钱包");
      return;
    }

    if (!tokenAddress) {
      alert("请填写代币合约地址");
      return;
    }

    if (recipients.length === 0) {
      alert("请上传 CSV 文件或手动添加接收者");
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenAddress,
          recipients,
          walletAddress: account,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          txHash: data.txHash,
          count: recipients.length,
        });
      } else {
        setResult({
          success: false,
          error: data.error || "发送失败",
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || "网络错误",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎁 批量空投
          </h1>
          <p className="text-gray-600">
            一键向多个地址发放代币
          </p>
        </div>

        {/* 连接钱包 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">钱包状态</p>
              <p className="font-medium">
                {account
                  ? `${account.slice(0, 6)}...${account.slice(-4)}`
                  : "未连接"}
              </p>
            </div>
            <button
              onClick={connectWallet}
              disabled={isConnecting || !!account}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                account
                  ? "bg-green-100 text-green-700 cursor-default"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {isConnecting ? "连接中..." : account ? "已连接" : "连接钱包"}
            </button>
          </div>
        </div>

        {/* 代币合约地址 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">代币信息</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              代币合约地址 *
            </label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* CSV 上传 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">上传接收者列表</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              📁 点击上传 CSV 文件
            </button>
            <p className="text-sm text-gray-500 mt-2">
              格式：地址，数量（每行一个）
            </p>
          </div>

          {/* 手动输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              或手动输入
            </label>
            <textarea
              value={csvContent}
              onChange={(e) => {
                setCsvContent(e.target.value);
                parseCSV(e.target.value);
              }}
              placeholder="0x123...,1000&#10;0x456...,2000"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          {/* 预览 */}
          {recipients.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                ✅ 已解析 {recipients.length} 个接收者
              </p>
              <div className="max-h-40 overflow-y-auto text-xs font-mono">
                {recipients.slice(0, 5).map((r, i) => (
                  <div key={i} className="text-gray-600">
                    {r.address.slice(0, 10)}... → {r.amount}
                  </div>
                ))}
                {recipients.length > 5 && (
                  <div className="text-gray-400">
                    ... 还有 {recipients.length - 5} 个
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 发送按钮 */}
          <button
            onClick={sendAirdrop}
            disabled={isSending || !account || recipients.length === 0}
            className={`w-full mt-6 py-3 rounded-lg font-medium text-white transition-colors ${
              isSending || !account || recipients.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isSending ? "发送中..." : `🚀 发送给 ${recipients.length} 个地址`}
          </button>
        </div>

        {/* 结果 */}
        {result && (
          <div
            className={`rounded-xl shadow-lg p-6 ${
              result.success
                ? "bg-green-50 border-2 border-green-200"
                : "bg-red-50 border-2 border-red-200"
            }`}
          >
            {result.success ? (
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  ✅ 空投成功！
                </h3>
                <p className="text-green-700 mb-2">
                  已发送给 {result.count} 个地址
                </p>
                {result.txHash && (
                  <a
                    href={`https://testnet.bscscan.com/tx/${result.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 underline text-sm"
                  >
                    在 BSCScan 查看交易 →
                  </a>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  ❌ 发送失败
                </h3>
                <p className="text-red-700">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {/* 返回链接 */}
        <div className="text-center mt-6">
          <a href="/" className="text-green-600 hover:text-green-800 underline">
            ← 返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
