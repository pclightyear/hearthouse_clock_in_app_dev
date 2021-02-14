import './main.css';
import './bulletin.css';
const config = require('./config.json');
const axios = require('axios');
var AWS = require('aws-sdk');

if (config.DEVELOPMENT) {
    var awsRegion = config.DEV.awsRegion;
    var IdentityPoolId = config.DEV.IdentityPoolId;
    var apiHOST = config.DEV.apiHOST;
} else {
    var awsRegion = config.PROD.awsRegion;
    var IdentityPoolId = config.PROD.IdentityPoolId;
    var apiHOST = config.PROD.apiHOST;
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

var fetchPostSuccess = false;

// fetch posts from dynamo DB
export function fetchBulletinPost() {
    // let url = `${apiHOST}/hearthouseGetBulletinPosts`;

    // axios.get(url)
    //     .then(res => {
    //         res = JSON.parse(res.Payload); 
    //         console.log(res);

    //         if (res.success) {
    //             var posts = res.posts;
    //             console.log(posts);
    //         } else {
    //             displayFetchPostsServerCrash()
    //         }
    //     })
    //     .catch(err => {
    //         console.log(err)
    //         displayFetchPostsServerCrash()
    //     })

    var params = {
    FunctionName: "hearthouseGetBulletinPosts"
    };
        
    lambda.invoke(params, function(err, data) {
        if (err) {
            console.log(err, err.stack) // an error occurred
            displayFetchPostsServerCrash()
        }  
        else {
            console.log(JSON.parse(data.Payload))
            var res = JSON.parse(data.Payload)
            if (res.success) {
                var posts = res.posts;
                console.log(posts);
                fetchPostSuccess = true;
                loadSuccessUIChange();
                populatePostList(posts);
            } else {
                displayFetchPostsServerCrash()
            }
        }
    });
}

var BULLETIN = "bulletin";
var LOADING_HINT = "loading-hint";
var NO_POST_HINT = "no-post-hint";

function loadSuccessUIChange() {
    if (fetchPostSuccess) {
        displayBulletin();
        removeLoadingHint();
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

function populatePostList(posts) {    
    var list = document.getElementById(BULLETIN);
    
    if (posts.length == 0) {
        document.getElementById(NO_POST_HINT).style.display = "block";
        return;
    }

    posts.forEach(post => {
        var postNode = document.createElement("a");
        postNode.href = "#";
        postNode.className = "list-group-item list-group-item-action";

        var headingNode = document.createElement("div");
        headingNode.className = "d-flex w-100 justify-content-between";

        var titleNode = document.createElement("h3");
        titleNode.className = "mb-1";
        titleNode.innerText = post.title;

        var tsNode = document.createElement("p");
        var ts = new Date(parseInt(post.ts));
        tsNode.innerText = `${ts.getFullYear()}/${ts.getMonth()+1}/${ts.getDate()}`;

        headingNode.appendChild(titleNode);
        headingNode.appendChild(tsNode);
        
        var paragraphNode = document.createElement("p");
        paragraphNode.innerText  = post.content;
        
        postNode.appendChild(headingNode);
        postNode.appendChild(paragraphNode);

        list.appendChild(postNode);
    });
}

function displayFetchPostsServerCrash() {
    alert("讀取公告欄失敗！看起來是伺服器出現問題了。\n請按 f5 再試一次。")
}
