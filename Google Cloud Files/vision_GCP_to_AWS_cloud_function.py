import json
import base64
from google.cloud import vision
import boto3
import decimal

def vision_pubsub(event, context):
    """Triggered from a message on a Cloud Pub/Sub topic.
    Args:
         event (dict): Event payload.
         context (google.cloud.functions.Context): Metadata for the event.
    """
    pubsub_message = json.loads(base64.b64decode(event['data']).decode('utf-8'))
    print(pubsub_message)

    client = vision.ImageAnnotatorClient()
    image = vision.types.Image()
    image.source.image_uri = pubsub_message['url']

    response = client.label_detection(image=image)

    labels = response.label_annotations

    scoreDict = {}
    for label in labels:
        scoreDict[label.description] = decimal.Decimal(label.score)

    item = {
        'url': pubsub_message['url'],
        'hash-tag': pubsub_message['hash-tag'],
        'hash-tag-list': pubsub_message['hash-tag-list'],
        'label-score': scoreDict
    }

    print(item)

    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('caption-ai-data')
    table.put_item(Item=item)
