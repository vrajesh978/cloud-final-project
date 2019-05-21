#!/usr/bin/python

import datetime
import time
import jwt
import paho.mqtt.client as mqtt
from lxml import html
import requests
from bs4 import BeautifulSoup
import re
import sys
import json
from multiprocessing import Process


def get_link(tag):
    initial = "https://www.pexels.com/search/"
    middle = "?page="
    page = 1
    prefix = initial + tag[1:] + middle
    page_link = prefix + str(page)
    cnt = 0
    link_list = set()
    print(len(link_list))

    while True:
        page_response = requests.get(page_link)
        page_content = BeautifulSoup(page_response.content, "html.parser")

        if cnt <= 1000: #page_content.find('img', class_ = 'photo-item__img') and
            for i in page_content.find_all('img', class_ = 'photo-item__img'):
                print(i["src"])
                link_list.add(i["src"])
            cnt += 30

            page += 1
            page_link = prefix + str(page)
            print(len(link_list))
            print(page_link)
            # print(page_link)
        else:
            break

    return link_list


def main(device_number, tagsList, numImageTag = 50, limit = 250):
    ssl_private_key_filepath = './rsa_private.pem'
    ssl_algorithm = 'RS256' # Either RS256 or ES256
    root_cert_filepath = './roots.pem'
    project_id = 'iot-image-extraction'
    gcp_location = 'us-central1'
    registry_id = 'image-extracters'
    device_id = 'image-extracter-'+str(device_number)


    cur_time = datetime.datetime.utcnow()

    def create_jwt():
        token = {
        'iat': cur_time,
        'exp': cur_time + datetime.timedelta(minutes=60),
        'aud': project_id
        }

        with open(ssl_private_key_filepath, 'r') as f:
            private_key = f.read()

        return jwt.encode(token, private_key, ssl_algorithm)

    _CLIENT_ID = 'projects/{}/locations/{}/registries/{}/devices/{}'.format(project_id, gcp_location, registry_id, device_id)
    _MQTT_TOPIC = '/devices/{}/events'.format(device_id)

    client = mqtt.Client(client_id=_CLIENT_ID)

    client.username_pw_set(
        username='unused',
        password=create_jwt())

    def error_str(rc):
        return '{}: {}'.format(rc, mqtt.error_string(rc))

    def on_connect(unusued_client, unused_userdata, unused_flags, rc):
        print('on_connect', error_str(rc))

    def on_publish(unused_client, unused_userdata, unused_mid):
        print('on_publish')

    client.on_connect = on_connect
    client.on_publish = on_publish

    client.tls_set(ca_certs=root_cert_filepath, tls_version=2) # Replace this with 3rd party cert if that was used when creating registry
    client.connect('mqtt.googleapis.com', 8883)
    client.loop_start()


    ###################################################################################################################

    instagram_url="https://www.instagram.com/explore/tags/"
    dataframe = []
    # allDescriptionTuple = []

    print(tagsList)

    for tag in tagsList:
        link_list = get_link(tag)
        count = 0
        print(len(link_list))
        for url in link_list:
            data = {"hash-tag": tag, "url": url}
            count += 1
            payload = json.dumps(data)
            client.publish(_MQTT_TOPIC, payload, qos=1)
            if count % 10 == 0:
                time.sleep(5)

                
    ###################################################################################################################


    client.loop_stop()


# reading hashtags from file
with open('text.txt','r') as tagsfile:
  tags = tagsfile.read()
tagsList = tags.split('\n')


if __name__ == '__main__':
    process_list = []
    # main(1, tagsList)
    for i in range(10):
        p = Process(target=main, args=(i+1, tagsList[0+i*5:i*5+5], 200, 250))
        process_list.append(p)
        p.start()

    for p in process_list:
        p.join()
