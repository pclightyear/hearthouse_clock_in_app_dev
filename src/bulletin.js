import './main.css';
import './bulletin.css';
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

var backgroundImageUrl;
var posts;
var fetchPostSuccess = false;
var fetchBackgroundImageSuccess = false;

// fetch posts from dynamo DB
export function fetchBulletinPost() {
    var params = {
        FunctionName: "hearthouseGetBulletinPosts"
    };
        
    lambda.invoke(params, function(err, data) {
        if (err) {
            console.log(err, err.stack) // an error occurred
            displayServerErrorMsg()
        }  
        else {
            // console.log(JSON.parse(data.Payload))
            var res = JSON.parse(data.Payload)
            if (res.success) {
                fetchPostSuccess = true;
                posts = res.posts;
                // console.log(posts);
                loadSuccessUIChange();
            } else {
                displayServerErrorMsg()
            }
        }
    });
}

// fetch background image url from dynamo DB
export function fetchBackgroundImage() {
    var params = {
        FunctionName: "hearthouseFetchFrontEndBackgroundImage"
    };
    
    lambda.invoke(params, function(err, data) {
        if (err) {
            console.log(err, err.stack) // an error occurred
            displayServerErrorMsg();
        } 
        else {
            var res = JSON.parse(data.Payload)
            if (res.success) {
                fetchBackgroundImageSuccess = true;
                backgroundImageUrl = res.url;
                loadSuccessUIChange();
            } else {
                displayServerErrorMsg();
            }
        }
    })
}

var BG = "bg"
var BULLETIN = "bulletin";
var LOADING_HINT = "loading-hint";
var NO_POST_HINT = "no-post-hint";

function loadSuccessUIChange() {
    if (fetchPostSuccess && fetchBackgroundImageSuccess) {
        populatePostList();

        displayBackground()
        displayBulletin();
        
        removeLoadingHint();
    }
}

function displayBackground() {
    if (backgroundImageUrl && backgroundImageUrl != "none") {
        // use other bg
        document.getElementById(BG).style.backgroundImage = `url(${backgroundImageUrl})`;
    } else {
        // default bg
        document.getElementById(BG).style.backgroundImage = "url('images/bg.jpg')";
    }
}

function displayBulletin() {
    document.getElementById(BULLETIN).style.display = "flex";
}

function removeLoadingHint() {
    document.getElementById(LOADING_HINT).style.display = "none";
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

function populatePostList() {    
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
        tsAuthorNode.innerText = `張貼者：${post.author}；張貼日期：${ts.getFullYear()}/${ts.getMonth()+1}/${ts.getDate()}`;
        tsAuthorNode.className = "post-ts-author-p";

        headingNode.appendChild(titleNode);
        headingNode.appendChild(tsAuthorNode);
        
        var paragraphNode = document.createElement("p");
        paragraphNode.innerText  = post.content;
        
        postNode.appendChild(headingNode);
        postNode.appendChild(paragraphNode);

        postNodes.push(postNode);
    });

    postNodes = postNodes.reverse();
    postNodes.forEach(node => {
        list.appendChild(node);
    })
}

function displayServerErrorMsg() {
    alert("出現異常狀態，請按F5重整頁面，\n或使用舊的打卡系統打卡。")
}
