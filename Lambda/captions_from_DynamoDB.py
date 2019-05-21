import json
import random 
import boto3
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    # TODO implement
    curr_tag = event["tag"]
    dynamodb = boto3.client('dynamodb')
    
    try:
        response = dynamodb.get_item(TableName='captions', Key={ "tag" : {"S" : curr_tag}})
    except ClientError as e:
        print("ooops!")
    else:
        here = random.randint(0,21)
        res = response["Item"]["quotes"]["SS"][here:here+5]
        print(res)
    
    return {
        'statusCode': 200,
        'body': res
    }