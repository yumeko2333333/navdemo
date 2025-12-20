<?php
// KSWEB Webhook 自动部署脚本
$logFile = "webhook.log";
$secret = 'navdemo1gB738lGiIDpvMay5'; // 确保与Gitee中设置的Secret一致

// 获取请求头信息
$signature = $_SERVER['HTTP_X_GITEE_TOKEN'] ?? ''; // Gitee
// 如果是GitHub，使用：$_SERVER['HTTP_X_HUB_SIGNATURE'] ?? '';

$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// 基础日志函数
function logMessage($message, $logFile) {
    $time = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$time] $message" . PHP_EOL, FILE_APPEND);
}

// 验证Secret[citation:1]
if ($signature !== $secret) {
    logMessage("Webhook Secret 验证失败！", $logFile);
    header('HTTP/1.1 403 Forbidden');
    exit('Forbidden');
}

logMessage("Webhook 触发开始", $logFile);

// 确定项目路径
$gitPath = "/sdcard/你的项目路径"; // 替换为你的网站在手机上的绝对路径

if (is_dir($gitPath)) {
    chdir($gitPath);
    
    // 执行Git拉取
    $output = shell_exec("git pull origin master 2>&1"); // 注意分支名
    
    logMessage("Git Pull 输出: " . $output, $logFile);
    
    // 可选：设置正确的文件所有者（KSWEB通常使用"u0_axx"这样的用户）
    // shell_exec("chown -R u0_a242:u0_a242 " . $gitPath);
    
    echo "自动部署完成！";
} else {
    logMessage("错误：项目目录不存在 - $gitPath", $logFile);
    header('HTTP/1.1 500 Internal Server Error');
    echo "项目目录不存在";
}

logMessage("Webhook 处理结束", $logFile);
?>