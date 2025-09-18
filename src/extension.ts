import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// 维护一个状态栏项的引用（全局或类属性）
let statusBarItem: vscode.StatusBarItem | undefined;

// 激活扩展时执行
export function activate(context: vscode.ExtensionContext) {
    // 注册切换环境的命令
    let disposable = vscode.commands.registerCommand('env.switcher', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('请先打开一个项目文件夹');
            return;
        }

        const rootPath = workspaceFolder.uri.fsPath;
        const configCenterPath = path.join(rootPath, '.vscode', 'config-center');
        try {
            // 1. 查找所有.env.*格式的环境文件
            const envFiles = await findEnvFiles(configCenterPath);
            if (envFiles.length === 0) {
                vscode.window.showInformationMessage('未找到任何.env.*环境文件');
                return;
            }

            // 2. 让用户选择要切换的环境
            const selectedEnv = await vscode.window.showQuickPick(
                envFiles.map(file => ({
                    label: file,
                    description: `切换到 ${file} 环境`
                })),
                { title: '选择要激活的环境' }
            );

            if (!selectedEnv) { return; }

            // 3. 复制选中的环境文件到.env
            const sourcePath = path.join(configCenterPath, selectedEnv.label);
            const targetPath = path.join(rootPath, '.env');
            
            await copyFile(sourcePath, targetPath);
            
            // 4. 显示成功信息并更新状态栏
            vscode.window.showInformationMessage(`已切换到 ${selectedEnv.label} 环境`);
            updateStatusBar(selectedEnv.label.replace('.env.', ''));

        } catch (error) {
            vscode.window.showErrorMessage(`切换失败: ${(error as Error).message}`);
        }
    });

    context.subscriptions.push(disposable);
}

// 查找项目中所有.env.*文件
async function findEnvFiles(rootPath: string): Promise<string[]> {
    // const files = await vscode.workspace.findFiles('**/.env.*', '** /node_modules/**', 100); '**/.env.*' 表示匹配任意目录
    const files = await vscode.workspace.findFiles('.vscode/config-center/.env.*', '** /node_modules/**', 100);
    return files
        .map(file => path.basename(file.fsPath))
        .filter(name => name !== '.env' && name.startsWith('.env.'));
}

// 复制文件
function copyFile(source: string, target: string): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.copyFile(source, target, (err) => {
            if (err) { reject(err); }
            else { resolve(); }
        });
    });
}

// 更新状态栏显示当前环境
function updateStatusBar(envName: string) {
    if (statusBarItem) {
        // 存在则更新文本
        statusBarItem.text = envName;
    }else{
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }
    statusBarItem.text = `🟢 当前环境: ${envName}`;
    statusBarItem.show();
}

// 扩展销毁时执行
export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
        statusBarItem = undefined;
    }
}
