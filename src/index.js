import './main.css';
import './index.css';
const config = require('./config.json');
var AWS = require('aws-sdk');

if (config.DEVELOPMENT) {
    var awsRegion = config.DEV.awsRegion;
    var IdentityPoolId = config.DEV.IdentityPoolId;
} else {
    var awsRegion = config.PROD.awsRegion;
    var IdentityPoolId = config.PROD.IdentityPoolId;
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

var nameList;
var fetchNameListSuccess = false;
var fetchPostSuccess = false;

// fetch name list from dynamoDB
export function fetchNameList() {
    var params = {
        FunctionName: "hearthouseGetNameList"
    };

    lambda.invoke(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            displayServerErrorMsg()
        }  
        else {
            var res = JSON.parse(data.Payload)
            nameList = res.nameList;
            nameList.sort()

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

// fetch posts from dynamo DB
export function fetchBulletinPost() {
    var params = {
        FunctionName: "hearthouseGetBulletinPosts"
    };
        
    lambda.invoke(params, function(err, data) {
        if (err) {
            console.log(err, err.stack) // an error occurred
            displayFetchPostsServerCrash()
        }  
        else {
            // console.log(JSON.parse(data.Payload))
            var res = JSON.parse(data.Payload)
            if (res.success) {
                var posts = res.posts;
                // console.log(posts);
                fetchPostSuccess = true;
                loadSuccessUIChange();
                populatePostList(posts);
            } else {
                displayFetchPostsServerCrash()
            }
        }
    });
}

var NAME_DROPDOWN = "name-dropdown";
var CLOCK_IN_BUTTON = "clock-in-button"
var LOADING_HINT = "loading-hint"

var BULLETIN = "bulletin";
var LOADING_HINT = "loading-hint";
var NO_POST_HINT = "no-post-hint";

function loadSuccessUIChange() {
    if (fetchNameListSuccess && fetchBulletinPost) {
        displayDropDownMenus()
        displayButtons()
        removeLoadingHint();

        displayBulletin();
        removeLoadingHint();
    }
}

// dropdown menu
function displayDropDownMenus() {
    document.getElementById(NAME_DROPDOWN).style.display = "flex";
}

function displayButtons() {
    document.getElementById(CLOCK_IN_BUTTON).style.display = "flex";
}

// bulletin
function displayBulletin() {
    document.getElementById(BULLETIN).style.display = "flex";
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

/*
<a href="#" class="list-group-item list-group-item-action" aria-current="true">
    <div class="d-flex w-100 justify-content-between">
        <h3 class="mb-1">List group item heading</h5>
        <p>2021/2/13</p>
    </div>
    <p class="mb-1">Some placeholder content in a paragraph.</p>
</a>
*/

function populatePostList(posts) {    
    var list = document.getElementById(BULLETIN);
    var postNodes = [];
    
    if (posts.length == 0) {
        document.getElementById(NO_POST_HINT).style.display = "block";
        return;
    }

    posts.forEach(post => {
        var postNode = document.createElement("li");
        postNode.href = "#";
        postNode.className = "list-group-item list-group-item-action";

        var headingNode = document.createElement("div");
        headingNode.className = "d-flex w-100 justify-content-between";

        var titleNode = document.createElement("h3");
        titleNode.className = "mb-1";
        titleNode.innerText = post.title;

        var tsAuthorNode = document.createElement("p");
        var ts = new Date(parseInt(post.ts));
        tsAuthorNode.innerText = `張貼者：${post.author}、張貼日期：${ts.getFullYear()}/${ts.getMonth()+1}/${ts.getDate()}`;
        tsAuthorNode.className = "post-ts-author-p";

        headingNode.appendChild(titleNode);
        // headingNode.appendChild(tsAuthorNode);
        
        var paragraphNode = document.createElement("p");
        paragraphNode.innerText  = post.content;
        
        postNode.appendChild(headingNode);
        postNode.appendChild(tsAuthorNode);
        postNode.appendChild(paragraphNode);

        postNodes.push(postNode);
    });

    postNodes = postNodes.reverse();
    postNodes.forEach(node => {
        list.appendChild(node);
    })
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
                    // window.location.href = "./bulletin.html";
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
