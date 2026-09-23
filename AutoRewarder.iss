[Setup]
AppName=AutoRewarder
AppId=AutoRewarder
AppVersion=4.3.40
AppPublisher=iGlitchOff
AppPublisherURL=https://github.com/iGlitchOn/AutoRewarder-PC
DefaultDirName={pf}\AutoRewarder
DefaultGroupName=AutoRewarder
OutputDir=dist
OutputBaseFilename=AutoRewarder-Setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
WizardStyle=modern dynamic
DisableWelcomePage=no
LicenseFile=LICENSE
CloseApplications=force
CloseApplicationsFilter=AutoRewarder.exe
RestartApplications=no
UninstallDisplayName=AutoRewarder
UninstallDisplayIcon={app}\AutoRewarder.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "dist\AutoRewarder\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\AutoRewarder"; Filename: "{app}\AutoRewarder.exe"; IconFilename: "{app}\AutoRewarder.exe"; Tasks: startmenu
Name: "{group}\Uninstall AutoRewarder"; Filename: "{uninstallexe}"; Tasks: startmenu
Name: "{commondesktop}\AutoRewarder"; Filename: "{app}\AutoRewarder.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional tasks:"
Name: "startmenu"; Description: "Create Start Menu shortcut"; GroupDescription: "Additional tasks:"

[Run]
Filename: "{app}\AutoRewarder.exe"; Description: "Launch AutoRewarder"; Flags: nowait postinstall skipifsilent
  Filename: "https://github.com/iGlitchOn/AutoRewarder-PC/blob/main/USER_GUIDE.md"; Description: "Read User Guide on GitHub"; Flags: shellexec nowait postinstall
  Filename: "https://github.com/iGlitchOn/AutoRewarder-PC"; Description: "Open GitHub repository"; Flags: shellexec nowait postinstall skipifsilent unchecked
Filename: "https://buymeacoffee.com/safarsin"; Description: "Support development (Buy me a coffee)"; Flags: shellexec nowait postinstall skipifsilent unchecked

[Code]
var
  GDeleteUserData: Boolean;

procedure KillRunningAutoRewarder;
var
  ResultCode: Integer;
begin
  { close_to_tray turns WM_CLOSE into a tray hide. Force-kill the tree. }
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM AutoRewarder.exe /T',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM msedgedriver.exe /T',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(800);
end;

procedure RemoveWindowsHooks;
var
  ResultCode: Integer;
begin
  Exec(ExpandConstant('{sys}\schtasks.exe'), '/Delete /TN "AutoRewarder" /F',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
    '-NoProfile -ExecutionPolicy Bypass -Command "Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -like ''AutoRewarder*'' } | Unregister-ScheduledTask -Confirm:$false"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  RegDeleteValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Run', 'AutoRewarder');
  RegDeleteValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Run', 'AutoRewarderGUI');
  DeleteFile(ExpandConstant('{userappdata}\Microsoft\Windows\Start Menu\Programs\Startup\AutoRewarder.lnk'));
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  RunCmd: String;
  Expected: String;
begin
  if CurStep <> ssPostInstall then
    Exit;
  { Install must not delete accounts. Only drop a Run command for another exe. }
  Expected := ExpandConstant('{app}\AutoRewarder.exe');
  if RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Run', 'AutoRewarderGUI', RunCmd) then
  begin
    if Pos(LowerCase(Expected), LowerCase(RunCmd)) = 0 then
      RegDeleteValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Run', 'AutoRewarderGUI');
  end;
end;

function InitializeUninstall(): Boolean;
begin
  Result := True;
  GDeleteUserData := True;
  if MsgBox(
       'AutoRewarder will be closed if it is running, including the tray icon.' + #13#10#13#10 +
       'Also delete saved accounts, Edge profiles, history and settings from this PC?',
       mbConfirmation, MB_YESNO) = IDNO then
    GDeleteUserData := False;
  KillRunningAutoRewarder;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    KillRunningAutoRewarder;
    RemoveWindowsHooks;
    if GDeleteUserData then
    begin
      DelTree(ExpandConstant('{localappdata}\AutoRewarder'), True, True, True);
      DelTree(ExpandConstant('{userappdata}\AutoRewarder'), True, True, True);
    end;
  end;
end;

procedure ExitSetupWithError(ErrorMsg: String);
begin
  SuppressibleMsgBox(ErrorMsg, mbCriticalError, MB_OK, IDOK);
  Abort;
end;

function IsDotNetInstalled: Boolean;
var
  VersionStr: String;
begin
  Result := False;
  { Check for .NET Framework 4.8 or higher / .NET 6+ }
  try
    if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Version', VersionStr) then
    begin
      Result := True;
    end;

    { Also check for .NET 6+ }
    if not Result then
      Result := RegKeyExists(HKLM, 'SOFTWARE\dotnet\Setup\InstalledVersions\x64');
  except
  end;
end;

function IsMicrosoftEdgeInstalled: Boolean;
begin
  Result := RegKeyExists(HKLM, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Microsoft Edge');
  if not Result then
    Result := FileExists('C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') or
              FileExists('C:\Program Files\Microsoft\Edge\Application\msedge.exe');
end;

function CheckDependencies: Boolean;
var
  ErrorMsg: String;
begin
  Result := True;
  ErrorMsg := '';

  if not IsMicrosoftEdgeInstalled then
  begin
    ErrorMsg := ErrorMsg + '• Microsoft Edge is not installed. Download it from: https://www.microsoft.com/en-us/edge' + #13#10;
    Result := False;
  end;

  if not IsDotNetInstalled then
  begin
    ErrorMsg := ErrorMsg + '• .NET Framework 4.8 or higher is not installed. Download from: https://dotnet.microsoft.com/download/dotnet' + #13#10;
    Result := False;
  end;

  if not Result then
  begin
    ExitSetupWithError('AutoRewarder requires the following:' + #13#10#13#10 + ErrorMsg + #13#10 +
                       'Please install the required software and try again.');
  end;
end;

procedure InitializeWizard;
begin
  if not CheckDependencies then
    Abort;

  MsgBox('AutoRewarder will be installed.' + #13#10#13#10 +
         'System Requirements:' + #13#10 +
         '• Windows 10 or later' + #13#10 +
         '• Microsoft Edge' + #13#10 +
         '• .NET Framework 4.8 or higher' + #13#10#13#10 +
         'After installation, you can access the User Guide on GitHub.',
         mbInformation, MB_OK);
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
end;
