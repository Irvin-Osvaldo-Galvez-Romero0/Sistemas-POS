@echo off
set ADB="C:\Users\User\AppData\Local\Android\Sdk\platform-tools\adb.exe"
%ADB% shell input tap 1270 610
ping 127.0.0.1 -n 2 >nul
%ADB% shell input tap 730 730
