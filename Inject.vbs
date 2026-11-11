Option Explicit
Dim files, shell, folder, command
Set files = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = files.GetParentFolderName(WScript.ScriptFullName)
command = "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & folder & "\Launch.ps1"""
shell.Run command, 0, False
