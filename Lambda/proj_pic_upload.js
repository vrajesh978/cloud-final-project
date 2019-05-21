let AWS = require('aws-sdk');
const vision = require('@google-cloud/vision');
var lambda = new AWS.Lambda({
  region: 'us-east-1' 
});
const method = "local"


let gc_user = "./XXXXXXX.json"; // here put your secret key to call cloud vision api
let s3 = new AWS.S3();
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const client = new vision.ImageAnnotatorClient({
    projectId: gc_user.project_id, //'captai',
    keyFilename: gc_user
});
async function getImageLabels(image) {
    // Performs label detection on the image file
    const [result] = await client.labelDetection({image: {content: image}});
    const labels = result.labelAnnotations;
    let lb = {};
    // console.log('Labels:');
    labels.forEach(label => {
        // console.log(label.description)
        lb[label.description] = label.score;
    });
    // console.log(lb)
    return lb;
}

function writeToDynamo(url, userName, s3_res, labels, tags) {
    var params = {
        TableName: "user-caption-data",//"yelp-restaurants",
        Item: {
            "url":  {S: url},
            "userName": {S: userName},
            "labels": {
                M: {
                }
            },
            "tags": {
                L: []
            }
        }
    };
    Object.keys(labels).forEach((key) => {
        params.Item.labels.M[key] = {
            N: labels[key].toString()
        };
    });
    tags.forEach((tag) => {
        params.Item.tags.L.push(
            {S: tag}
        );
    });
        
    return dynamodb.putItem(params).promise();
}
exports.handler = async (event) => {
    console.log("event: ", event.name);
    const response = {
        statusCode: 500,
        body: JSON.stringify('hold tight, well be back soon'),
    };
    let userName = event.userName,
        key = "photos/"+userName+"/"+String(Date.now())+"."+event.extension,
        bucket = "proj-images-tagging";
    let url = "https://s3.amazonaws.com/"+bucket+"/"+key;
    var s3_params = {
        Body: event.image,
        Bucket: bucket,
        Key: key,
        // Tagging: "key1=value1&key2=value2"
    };
    let s3_res = null,
        labels = null,
        tagsl = null,
        tags = null;
    await s3.putObject(s3_params)
        .promise()
        .then((data) => {
            s3_res = data;
            // response.statusCode = 200;
            // response.body = "Image uploaded to bucket.";
            console.log("s3: ", data);
        })
        .catch(err => {
            response.statusCode = 500;
            response.body = "error occured while uploading image to s3.";
            console.log(err, err.stack); // an error occurred  
        });
    await getImageLabels(event.image).then((data) => {
        labels = data;
        response.body += "\nfetched Image labels successfully..";
        console.log("labels: ", data);
    })
    .catch(err => {
        console.log("error fetching labels: ", err);
        response.statusCode = 500;
        response.body += "\nerror fetching labels";
    });
    if(labels != null) {
        console.log("method: ", method)    
        await lambda.invoke({
          InvocationType: "RequestResponse", //"Event",
          FunctionName: 'trigger-sagemaker',
          Payload: JSON.stringify(labels) 
        })
        .promise()
        .then((data) => {
            console.log("lambda response: ", data);
              let rsp = JSON.parse(data.Payload);
              tags = rsp.body;
        })
        .catch((error) => {
            console.log('lambda error', error);
        });
        console.log("lambda tags: ", tags);
        // }
    } else {
        response.statusCode = 500;
        response.body = "could not find labels object";
        return response;
    } 
    // tags = ["#friends","#fun","#love"];
    if(s3_res != null && labels != null && tags != null) {
        console.log("tags: ", tags);
        console.log(typeof(tags));
        tags = tags.slice(0, 5);
        await writeToDynamo(url, event.userName, s3_res, labels, tags).then((res) => {
            // response.body += "\nsuccessfully written to dynamo";
            console.log("dynamo: ", res);
            response.statusCode = 200;
            response.body = JSON.stringify(tags);
        })
        .catch(err => {
            response.statusCode = 500;
            response.body += "\nfailed to write to dynamo";
            console.log("error writing to dynamo", err);
        });
    }
    if(response.statusCode ==  500){
        throw new Error(response.body)
    }
    return response;
};
