import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execPromise = promisify(exec);

// 验证合约源码（Etherscan API V2）
async function verifyContract(
  contractAddress: string,
  sourceCode: string,
  compilerVersion: string
) {
  const params = new URLSearchParams({
    module: 'contract',
    action: 'verifysourcecode',
    apikey: process.env.ETHERSCAN_API_KEY || '',
    chainId: '56', // BNB Smart Chain
    sourceCode: sourceCode,
    contractaddress: contractAddress, // V2 使用小写
    codeformat: 'solidity-single-file', // V2 使用小写
    compilerversion: compilerVersion,
    optimizationused: '1',
    runs: '200'
  });

  // V2 API 端点
  const response = await fetch('https://api.etherscan.io/v2/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  return await response.json();
}

// 检查验证状态（Etherscan API V2）
async function checkVerificationStatus(contractAddress: string) {
  const params = new URLSearchParams({
    module: 'contract',
    action: 'getsourcecode',
    apikey: process.env.ETHERSCAN_API_KEY || '',
    chainId: '56', // BNB Smart Chain
    address: contractAddress
  });

  const response = await fetch(`https://api.etherscan.io/v2/api?${params.toString()}`);
  const data = await response.json();

  if (data.status === '1' && data.result && data.result.length > 0) {
    // 如果返回了源码，说明已验证
    return { verified: true, status: 'Verified' };
  } else if (data.status === '0' && data.result === 'Contract source code not verified') {
    return { verified: false, status: 'Pending' };
  } else {
    return { verified: false, status: 'Unknown', error: data.result };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, symbol, initialSupply, walletAddress, decimals = 18, mintable = false, taxRate = 0, pausable = false } = body;

    // 验证参数
    if (!name || !symbol || !initialSupply) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 项目根目录
    const projectRoot = "/home/admin/.openclaw/workspace/AssistantTools";

    // 读取合约源码
    const contractPath = `${projectRoot}/contracts/AssistantToken.sol`;
    let sourceCode = fs.readFileSync(contractPath, 'utf-8');
    
    // 根据参数修改合约源码（替换默认值）
    if (decimals !== 18) {
      sourceCode = sourceCode.replace(
        'uint8 private _decimals = 18;',
        `uint8 private _decimals = ${decimals};`
      );
    }

    // 创建临时脚本，使用传入的参数
    const tempScript = `
      require('dotenv').config();
      const { Thirdweb } = require("thirdweb");
      const { privateKeyToAccount } = require("thirdweb/wallets");
      const { createThirdwebClient } = require("thirdweb");
      const { deployERC20Contract } = require("thirdweb/deploys");

      const CLIENT_ID = "assistant-tools";
      const CHAIN_ID = 97;

      async function deployToken() {
        try {
          const client = createThirdwebClient({ clientId: CLIENT_ID });
          
          if (!process.env.PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY 未配置");
          }
          
          const account = privateKeyToAccount({
            client,
            privateKey: process.env.PRIVATE_KEY
          });
          
          const chain = await client.getChain(CHAIN_ID);
          
          // 计算实际的初始供应量（考虑小数位）
          const actualSupply = BigInt("${initialSupply}") * BigInt(10 ** ${decimals});
          
          const contract = await deployERC20Contract(client, {
            name: "${name}",
            symbol: "${symbol}",
            initialSupply: actualSupply,
            decimals: ${decimals},
            chain: chain,
            account: account
          });
          
          console.log(JSON.stringify({
            success: true,
            contractAddress: contract.address,
            name: "${name}",
            symbol: "${symbol}",
            decimals: ${decimals}
          }));
        } catch (error) {
          console.log(JSON.stringify({
            success: false,
            error: error.message
          }));
        }
      }

      deployToken();
    `;

    // 写入临时文件
    const tempPath = `${projectRoot}/.temp-deploy.js`;
    fs.writeFileSync(tempPath, tempScript);

    // 执行脚本
    const { stdout, stderr } = await execPromise(
      `cd ${projectRoot} && node .temp-deploy.js`,
      {
        timeout: 120000, // 2 分钟超时
        env: { ...process.env },
      }
    );

    // 清理临时文件
    fs.unlinkSync(tempPath);

    // 解析输出
    const lines = stdout.trim().split("\n");
    const lastLine = lines[lines.length - 1];

    try {
      const result = JSON.parse(lastLine);
      
      // 如果部署成功，自动验证合约
      if (result.success && result.contractAddress) {
        // 异步验证，不阻塞响应
        verifyContract(
          result.contractAddress,
          sourceCode,
          'v0.8.20+commit.a1b79de6' // Solidity 0.8.20 版本
        ).then(verifyResult => {
          console.log('合约验证结果 (Etherscan V2):', verifyResult);
        }).catch(err => {
          console.error('验证请求失败:', err);
        });

        result.verificationStatus = 'pending'; // 验证中
      }
      
      return NextResponse.json(result);
    } catch {
      return NextResponse.json(
        { success: false, error: "部署响应格式错误" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("部署错误:", error);
    return NextResponse.json(
      { success: false, error: error.message || "部署失败" },
      { status: 500 }
    );
  }
}

// 检查验证状态的 API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contractAddress = searchParams.get('address');

  if (!contractAddress) {
    return NextResponse.json(
      { success: false, error: "缺少合约地址" },
      { status: 400 }
    );
  }

  try {
    const status = await checkVerificationStatus(contractAddress);
    return NextResponse.json({
      success: true,
      verified: status.verified,
      status: status.status,
      error: status.error
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
