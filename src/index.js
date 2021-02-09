import './index.css';
const config = require('./config.json');
var AWS = require('aws-sdk');

if (config.DEVELOPMENT) {
    var awsRegion = config.DEV.awsRegion;
    var IdentityPoolId = config.DEV.IdentityPoolId;
    var BucketName = config.DEV.BucketName;
    var NameListFileKey = config.DEV.NameListFileKey;  
} else {
    var awsRegion = config.PROD.awsRegion;
    var IdentityPoolId = config.PROD.IdentityPoolId;
    var BucketName = config.PROD.BucketName;
    var NameListFileKey = config.PROD.NameListFileKey;  
};

AWS.config.update({
    region: awsRegion,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId
    })
});

var lambda = new AWS.Lambda({
    apiVersion: '2015-03-31',
    region: awsRegion,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId
    })
});

var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: awsRegion,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId
    })
});

var nameList;
var fetchNameListSuccess = false;

// fetch name list from s3 bucket
export function fetchNameList() {
    var params = {
        Bucket: BucketName, 
        Key: NameListFileKey, 
    };

    s3.getObject(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            displayServerErrorMsg()
        } else {
            var json = JSON.parse(data.Body.toString());
            nameList = json.nameList;
        
            if (!nameList) {
                displayServerErrorMsg();
            } else {
                fetchNameListSuccess = true;
                loadSuccessUIChange();
                populateDropdownMenu();
            }
        }
    });
};

var NAME_DROPDOWN = "name-dropdown";
var CLOCK_IN_BUTTON = "clock-in-button"
var LOADING_HINT = "loading-hint"

function loadSuccessUIChange() {
    if (fetchNameListSuccess) {
        displayDropDownMenus()
        displayButtons()
        removeLoadingHint();
    }
}

function displayDropDownMenus() {
    document.getElementById(NAME_DROPDOWN).style.display = "block";
}

function displayButtons() {
    document.getElementById(CLOCK_IN_BUTTON).style.display = "block";
}

function removeLoadingHint() {
    document.getElementById(LOADING_HINT).style.display = "none";
}

function populateDropdownMenu() {
    var menu = document.getElementById("nameDropdownMenu");

    var i = 1;
    nameList.forEach(name => {
        var link = document.createElement("a");             
        var text = document.createTextNode(`${i.toString().padStart(2, '0')}. ${name}`);
        link.appendChild(text);
        link.href = "#";
        link.className = "dropdown-item"
        menu.appendChild(link);
        i += 1;
    });

    // click function to change menu's display name
    $("#nameDropdownMenu a").click(function() {
        $("#dropdownMenuButton").text($(this).text());
    });
}

export function clockIn() {
    var clockInTs = Date.now().toString()

    var name = $("#dropdownMenuButton").text();
    name = name.replace(/\s/g, "")
    
    if (name == "yourname") {
        // please choose a name
        console.log("no name")
        displayNoNameAlert()
    } else {
        // send clock in msg to the server
        console.log($("#dropdownMenuButton").text())

        var params = {
            FunctionName: "hearthouseClockIn", 
            Payload: JSON.stringify({
                "name": $("#dropdownMenuButton").text().split(' ')[1],
                "ts": clockInTs
            }), 
        };
        
        lambda.invoke(params, function(err, data) {
            if (err) {
                console.log(err, err.stack) // an error occurred
                displayClockInServerCrash()
            }  
            else {
                console.log(JSON.parse(data.Payload))
                var res = JSON.parse(data.Payload)
                if (res.success) {
                    displayClockInSuccess(clockInTs)
                } else if (res.isTooEarly) {
                    displayClockInTooEarly()
                } else if (res.noShift) {
                    displayClockInNoShift()
                } else {
                    displayClockInServerCrash()
                }
            }
        });
    }
}

function displayServerErrorMsg() {
    alert("出現異常狀態，請按F5重整頁面，\n或使用舊的打卡系統打卡。")
}

function displayNoNameAlert() {
    alert("請選擇你的名字之後再打卡！")
}

function displayClockInSuccess(clockInTs) {
    var date = new Date(parseInt(clockInTs))
    alert(`打卡成功！\n打卡時間：${date.toLocaleTimeString()}`)
}

function displayClockInTooEarly() {
    alert("打卡失敗！請在值班時間的 40 分鐘前以內打卡。")
}

function displayClockInNoShift() {
    alert("打卡失敗！今天不需要值班喔(笑")
}

function displayClockInServerCrash() {
    alert("打卡失敗！看起來是伺服器出現問題了。\n請按 f5 再試一次，或使用舊的打卡系統打卡。")
}
