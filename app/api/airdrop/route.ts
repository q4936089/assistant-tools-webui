import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenAddress, recipients, walletAddress } = body;

    // 验证参数
    if (!tokenAddress || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 创建 CSV 临时文件
    const projectRoot = "/home/admin/.openclaw/workspace/AssistantTools";
    const csvPath = `${projectRoot}/.temp-airdrop.csv`;
    const csvContent = recipients
      .map((r: any) => `${r.address},${r.amount}`)
      .join("\n");
    fs.writeFileSync(csvPath, csvContent);

    // 创建临时脚本
    const tempScript = `
      require('dotenv').config();
      const { Thirdweb } = require("thirdweb");
      const { privateKeyToAccount } = require("thirdweb/wallets");
      const { createThirdwebClient } = require("thirdweb");
      const { getContract, readContract, writeContract } = require("thirdweb");
      const { erc20 } = require("thirdweb/erc20");

      const CHAIN_ID = 97;
      const TOKEN_ADDRESS = "${tokenAddress}";
      const CSV_PATH = "${csvPath}";

      async function airdrop() {
        try {
          const client = createThirdwebClient({ clientId: "assistant-tools" });
          
          if (!process.env.PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY 未配置");
          }
          
          const account = privateKeyToAccount({
            client,
            privateKey: process.env.PRIVATE_KEY
          });
          
          const chain = await client.getChain(CHAIN_ID);
          const contract = getContract({
            address: TOKEN_ADDRESS,
            chain,
            client
          });
          
          // 读取 CSV
          const fs = require('fs');
          const lines = fs.readFileSync(CSV_PATH, 'utf-8').trim().split('\\n');
          
          console.log(\`📝 准备发送给 \${lines.length} 个地址\`);
          
          // 批量发送（简化版，实际应该用 multicall）
          const results = [];
          for (const line of lines) {
            const [address, amount] = line.split(',');
            const tx = await writeContract({
              contract,
              method: "function transfer(address to, uint256 amount)",
              params: [address, BigInt(amount)],
              account
            });
            results.push(tx);
            console.log(\`✅ 发送给 \${address}: \${amount}\`);
          }
          
          console.log(JSON.stringify({
            success: true,
            txHash: results[results.length - 1].transactionHash,
            count: lines.length
          }));
        } catch (error) {
          console.log(JSON.stringify({
            success: false,
            error: error.message
          }));
        }
      }

      airdrop();
    `;

    const tempPath = `${projectRoot}/.temp-airdrop.js`;
    fs.writeFileSync(tempPath, tempScript);

    // 执行脚本
    const { stdout, stderr } = await execPromise(
      `cd ${projectRoot} && node .temp-airdrop.js`,
      {
        timeout: 300000, // 5 分钟超时
        env: { ...process.env },
      }
    );

    // 清理临时文件
    fs.unlinkSync(tempPath);
    fs.unlinkSync(csvPath);

    // 解析输出
    const lines = stdout.trim().split("\n");
    const lastLine = lines[lines.length - 1];

    try {
      const result = JSON.parse(lastLine);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json(
        { success: false, error: "空投响应格式错误" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("空投错误:", error);
    return NextResponse.json(
      { success: false, error: error.message || "空投失败" },
      { status: 500 }
    );
  }
}
