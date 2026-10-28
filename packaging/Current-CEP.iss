[Setup]
AppId={{650C04AE-9EA9-4F88-AB58-63FD86166521}
AppName=Current CEP
AppVersion=1.0.0.3
AppPublisher=Current contributors
AppPublisherURL=https://github.com/shauncreates/Current
DefaultDirName={commoncf32}\Adobe\CEP\extensions\com.shauncreates.current
DisableDirPage=yes
PrivilegesRequired=admin
OutputDir=..\artifacts
OutputBaseFilename=Current-CEP-1.0.0-preview.3-Setup
UninstallDisplayName=Current CEP
Compression=lzma2
SolidCompression=yes
[Tasks]
Name: unsigned; Description: "Enable unsigned CEP panels for this Windows account (required for this development preview)"; Flags: unchecked
[Files]
Source: "..\cep\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\LICENSE-MIT"; DestDir: "{app}"
Source: "..\LICENSE-APACHE"; DestDir: "{app}"
Source: "..\NOTICE.md"; DestDir: "{app}"
[InstallDelete]
Type: files; Name: "{app}\.debug"
[Code]
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssPostInstall) and (ExpandConstant('{param:debugtest|0}') = '1') then
    SaveStringToFile(ExpandConstant('{app}\.debug'), '<ExtensionList><Extension Id="com.shauncreates.current.panel"><HostList><Host Name="AEFT" Port="9237"/></HostList></Extension></ExtensionList>', False);
end;
[Registry]
Root: HKCU; Subkey: Software\Adobe\CSXS.10; ValueType: string; ValueName: PlayerDebugMode; ValueData: 1; Tasks: unsigned
Root: HKCU; Subkey: Software\Adobe\CSXS.11; ValueType: string; ValueName: PlayerDebugMode; ValueData: 1; Tasks: unsigned
Root: HKCU; Subkey: Software\Adobe\CSXS.12; ValueType: string; ValueName: PlayerDebugMode; ValueData: 1; Tasks: unsigned
