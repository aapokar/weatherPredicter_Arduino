#include <Firebase_Arduino_WiFi101.h>
#include <Firebase_Arduino_WiFi101_HTTPClient.h>
#include "arduino_secrets.h"
#include <SPI.h>
#include <WiFi101.h>
#include "DHT.h"
#include <ArduinoJson.h>

#define DHTPIN 2
#define DHTTYPE DHT22

///////please enter your sensitive data in the Secret tab/arduino_secrets.h
char ssid[] = SECRET_SSID;        // your network SSID (name)
char pass[] = SECRET_PASS;    // your network password (use for WPA, or use as key for WEP)
char fbhost[] = FIREBASE_HOST;  //Firebase host
char fbsecret[] = FIREBASE_AUTH;  //Firebase secret
String apiKey= SECRET_APIKEY; //Openweathermap apikey

int status = WL_IDLE_STATUS;
char server[] = "api.openweathermap.org";    // name address Openweathermap

// Initialize the Ethernet client library
// with the IP address and port of the server
// that you want to connect to (port 80 is default for HTTP):
WiFiClient client;

// Define firebase data object
FirebaseData firebaseData;

// Initialize DHT sensor.
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  //Set output pins, I used leds for debugging
  pinMode(5, OUTPUT); //Red led, especially for demonstrating errors
  pinMode(6, OUTPUT); //Buil-in led, for showing wifi-status
  pinMode(7, OUTPUT); //Blue led

  // attempt to connect to Wifi network:
  connectWifi();

  //Begin dht
  dht.begin();
  delay(2000);

}

void loop() {
  int i = 0;
  digitalWrite(7, HIGH);

  //Make 30 datareadings
  while (i<31) {
    if (WiFi.status()!= 3) {
      digitalWrite(6, LOW); //If connection is lost, turn builtin led off
    }
    digitalWrite(7, LOW);
    delay(600);
    if (WiFi.status() != 3) {
        //If connection is lost, retry connection to wifi
        digitalWrite(5, HIGH);
        status = WL_IDLE_STATUS;
        connectWifi();
        delay(100);
    }
    if (WiFi.status() == 3) {
        digitalWrite(5, HIGH);  //Debugging with led in pin 5: trying to fetch and push data
        pushOWM(i);
        pushDHT(i);
        digitalWrite(5, LOW);
        digitalWrite(7,HIGH);
        delay(1000*60*23); //25min delay
        i++;
    };
    digitalWrite(7, HIGH);

    

  };
    // do nothing forevermore:
    digitalWrite(5, HIGH);//Both leds on = infinite donothing loop
    digitalWrite(7, HIGH);
    while (true){
    delay(20000);
    };
  
}

void pushOWM(int indeksi) {
  // if you get a connection, report back via blinkin pin 7:
  if (client.connect(server, 80)) {
    // Make a HTTP request:
    client.print("GET /data/2.5/weather?");
    client.print("q=Lahti");
    client.print("&APPID="+apiKey);
    client.println("&units=metric");
    client.println("Host: api.openweathermap.org");
    client.println("Connection: close");
    client.println();
    digitalWrite(7, HIGH);
    delay(1000);
    digitalWrite(7, LOW);
  } else {
    digitalWrite(5, LOW); //Error: blink pin 5
    delay(1000);
    digitalWrite(5, HIGH);
    delay(1000);
    digitalWrite(5, LOW);
  }

  // Allocate the JSON document
  // Use arduinojson.org/v6/assistant to compute the capacity.
  const size_t capacity = JSON_ARRAY_SIZE(1) + JSON_OBJECT_SIZE(1) + 2*JSON_OBJECT_SIZE(2) + JSON_OBJECT_SIZE(4) + 2*JSON_OBJECT_SIZE(5) + JSON_OBJECT_SIZE(13) + 270;

  DynamicJsonDocument doc(capacity);

  // Parse JSON object. If error occurs, error = true
  DeserializationError error = deserializeJson(doc, client);
  if (error) {
    digitalWrite(5, LOW);  //Error: blink pin 5
    delay(1000);
    digitalWrite(5, HIGH);
    delay(1000);
    digitalWrite(5, LOW);
    return;
  }

  //Extract value temp from main
  JsonObject main = doc["main"];
  float lampotila = main["temp"];

  // Disconnect
  client.stop();

  delay(1000);
  
  //Begin firebase connection
  Firebase.begin(fbhost, fbsecret, ssid, pass);
  //Set reconnecting
  Firebase.reconnectWiFi(true);  

  //Serialize json
  String jsonStr = "{\"" + String(indeksi) + "\":" + String(lampotila) + "}";

  //push data to firebase
  if (Firebase.updateNode(firebaseData, "/owm", jsonStr)) {
    digitalWrite(7, HIGH);  //Success: blink pin 7
    delay(1000);
    digitalWrite(7, LOW);
  } else {
    digitalWrite(5, LOW);  //Error: blink pin 5
    delay(1000);
    digitalWrite(5, HIGH);
    delay(1000);
    digitalWrite(5, LOW);
  }
}

void pushDHT(int indeksi) {
  float t = dht.readTemperature();  //Read temperature in dht

  
  delay(1000);
  //Begin firebase connection
  Firebase.begin(fbhost, fbsecret, ssid, pass);
  //Set reconnecting
  Firebase.reconnectWiFi(true);

  //Serialize json
  String jsonStr = "{\"" + String(indeksi) + "\":" + String(t) + "}";

  //Push data to firebase
  if (Firebase.updateNode(firebaseData, "/dht22", jsonStr)) {
    digitalWrite(7, HIGH);
    delay(1000);
    digitalWrite(7, LOW);
    
  } else {
    digitalWrite(5, HIGH);
    delay(1000);
    digitalWrite(5, LOW);
  }
}



void connectWifi() {
    while (status != WL_CONNECTED) {

    // Connect to WPA/WPA2 network. Change this line if using open or WEP network:
      digitalWrite(6, LOW);  //While disconnected, pin6 off
      status = WiFi.begin(ssid, pass);

    // wait 10 seconds for connection:
      delay(10000);
  }
  //Connected to wifi
  digitalWrite(6, HIGH);
}
