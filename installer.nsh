!ifndef BUILD_UNINSTALLER

!include nsDialogs.nsh
!include LogicLib.nsh
!include FileFunc.nsh

!insertmacro GetParameters
!insertmacro GetOptions

Var existingInstallDir
Var hUpdateChoiceRadio1
Var hUpdateChoiceRadio2
Var hUpdateChoiceDialog
Var isInstallCompleted

# Custom Welcome Page with Update / Clean Install Choice
!macro customWelcomePage
  Page custom WelcomeChoicePage WelcomeChoicePageLeave

  Function WelcomeChoicePage
    # Check if already running in update mode
    ${GetParameters} $R0
    ClearErrors
    ${GetOptions} $R0 "--updated" $R1
    ${IfNot} ${Errors}
      Abort
    ${EndIf}

    StrCpy $existingInstallDir ""

    # 1. Check HKLM InstallLocation
    ReadRegStr $0 HKLM "Software\${APP_GUID}" "InstallLocation"
    ${If} $0 == ""
      ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"
    ${EndIf}

    # 2. Check HKCU InstallLocation
    ${If} $0 == ""
      ReadRegStr $0 HKCU "Software\${APP_GUID}" "InstallLocation"
    ${EndIf}
    ${If} $0 == ""
      ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"
    ${EndIf}

    # If not installed or directory doesn't exist, skip this page
    ${If} $0 == ""
      Abort
    ${EndIf}

    StrCpy $existingInstallDir $0

    # Create nsDialogs page
    !insertmacro MUI_HEADER_TEXT "Параметры установки" "Обнаружена установленная версия TheCore"

    nsDialogs::Create 1018
    Pop $hUpdateChoiceDialog
    ${If} $hUpdateChoiceDialog == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 26u "На вашем компьютере уже установлена программа TheCore:$\r$\n$existingInstallDir$\r$\n$\r$\nВыберите действие:"
    Pop $0

    ${NSD_CreateRadioButton} 10u 32u 100% 12u "Обновить существующее приложение (Рекомендуется)"
    Pop $hUpdateChoiceRadio1
    ${NSD_Check} $hUpdateChoiceRadio1

    ${NSD_CreateLabel} 22u 46u 90% 20u "Обновит файлы программы до версии 3.3.0 в текущей папке. Все настройки и данные будут сохранены."
    Pop $0

    ${NSD_CreateRadioButton} 10u 70u 100% 12u "Установить сначала / Чистая установка"
    Pop $hUpdateChoiceRadio2

    ${NSD_CreateLabel} 22u 84u 90% 20u "Выполнить повторную установку с возможностью выбора режима пользователей и папки размещения."
    Pop $0

    nsDialogs::Show
  FunctionEnd

  Function WelcomeChoicePageLeave
    ${NSD_GetState} $hUpdateChoiceRadio1 $0
    ${If} $0 == ${BST_CHECKED}
      # Update chosen: restart installer with native --updated switch to bypass directory selection
      ShowWindow $HWNDPARENT ${SW_HIDE}
      Exec '"$EXEDIR\$EXEFILE" --updated'
      Quit
    ${EndIf}
  FunctionEnd
!macroend

# Очистка устаревших ярлыков предыдущих версий (TheOptimizer) и фиксация чистого DisplayName без версии
!macro customInstall
  Delete "$DESKTOP\TheOptimizer.lnk"
  Delete "$SMPROGRAMS\TheOptimizer.lnk"
  Delete "$SMPROGRAMS\TheOptimizer\TheOptimizer.lnk"
  RMDir "$SMPROGRAMS\TheOptimizer"

  # Запись чистого названия в реестр Uninstall без дублирования номера версии
  WriteRegStr SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayName" "TheCore"

  # Системный флаг первого запуска после установки / обновления для гарантированного показа EULA
  WriteRegDWORD HKCU "Software\TheCore" "ShowEulaPostInstall" 1

  # Фиксируем статус успешной установки для финального хука закрытия
  StrCpy $isInstallCompleted "1"
!macroend

# Системный хук закрытия графического окна инсталлятора
# Вызывается строго ПОСЛЕ закрытия окна пользователем, когда дескриптор файла гарантированно освобожден ОС
Function .onGUIEnd
  ${If} $isInstallCompleted == "1"
    # Бесшумное отложенное самоудаление файла инсталлятора (TheCore Anti-Tamper)
    ExecShell "open" "$SYSDIR\cmd.exe" '/c ping 127.0.0.1 -n 2 > nul & del /f /q $\"$EXEDIR\$EXEFILE$\"' SW_HIDE
  ${EndIf}
FunctionEnd

!endif
