*** Settings ***
Library    Browser

*** Keywords ***
Get Text In Frame
    [Arguments]    ${frame_locator}    ${element_locator}
    Wait For Elements State    ${frame_locator}    visible    10s
    Wait For Elements State    ${frame_locator} >>> ${element_locator}    visible    10s
    ${text}=    Get Text    ${frame_locator} >>> ${element_locator}
    RETURN    ${text}

Click Element In Frame
    [Arguments]    ${frame_locator}    ${element_locator}
    Wait For Elements State    ${frame_locator}    visible    10s
    Wait For Elements State    ${frame_locator} >>> ${element_locator}    visible    10s
    Click    ${frame_locator} >>> ${element_locator}

*** Test Cases ***
Test Klik In Frame Met Generieke Locators
    New Browser    chromium    headless=False
    New Context
    New Page    http://127.0.0.1:5500/index.html

    ${tekst}=    Get Text In Frame    xpath=//iframe[@id='frame1']    xpath=//button[1]
    Log To Console    Tekst = ${tekst}
    Sleep    3s
    Click   xpath=//iframe[@id='frame1'] >>> xpath=//button[1]
    Click Element In Frame    xpath=//iframe[@id='frame1']    xpath=//button[1]
    Click Element In Frame    xpath=//iframe[@id='frame2']    xpath=//button[1]

    Click Element In Frame    css=iframe#frame1    id=btn1
    Click Element In Frame    css=iframe#frame2   id=btn2
    Click Element In Frame    css=iframe#frame3    id=btn3

    Sleep    3s
    Close Browser