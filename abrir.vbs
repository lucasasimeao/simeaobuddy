' SIMEAOBuddy: liga o servidor escondido (se ainda não estiver rodando) e abre o app.
' Sem argumentos: liga e abre o navegador. Com /sem-navegador: só liga (usado ao iniciar o Windows).
Option Explicit
Const PORTA = 3100

Dim sh, fso, pasta, i
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = pasta
If Not fso.FolderExists(pasta & "\logs") Then fso.CreateFolder(pasta & "\logs")

If Not Rodando() Then
  sh.Run "cmd /c node --disable-warning=ExperimentalWarning server.js >> logs\servidor.log 2>&1", 0, False
  For i = 1 To 30
    WScript.Sleep 500
    If Rodando() Then Exit For
  Next
End If

If WScript.Arguments.Count = 0 Then sh.Run "http://localhost:" & PORTA

Function Rodando()
  Dim http
  Rodando = False
  On Error Resume Next
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setTimeouts 1000, 1000, 1000, 1000
  http.Open "GET", "http://localhost:" & PORTA & "/api/saude", False
  http.Send
  If Err.Number = 0 Then Rodando = (http.Status = 200)
  On Error GoTo 0
End Function
