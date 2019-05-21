
from __future__ import print_function # Python 2/3 compatibility
import boto3
import json
import decimal



def lambda_handler(event, context):
    # TODO implement
    bucketname = "mainfinaldata"
    itemname = "captions.json"
    
    dynamodb = boto3.client('dynamodb')
    # table = dynamodb.Tablename("captions")
    
    s3 = boto3.client('s3')
    obj = s3.get_object(Bucket = bucketname, Key = itemname)
    
    print("here"  + str(obj) + "done")
    
    file_content = obj.get('Body').read().decode('utf-8')
    json_content = json.loads(file_content)
    
    print(type(json_content["love"]))
    for i in json_content:
        dynamodb.put_item(TableName='captions', Item={ "tag" : {"S" : i}, "quotes" : { "SS" : json_content[i] }})

        
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }