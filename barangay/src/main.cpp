#include <Arduino.h>

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <U8g2lib.h>

#include <time.h>

// ====== CONFIG ======
static const char* WIFI_SSID = "YOTC-B90347";
static const char* WIFI_PASSWORD = "47938800";

// Firebase config
static const char* FIREBASE_API_KEY     = "AIzaSyC1JbJ2SZNVoY-OhUzmZ_vI2Zac98tSp9g";
static const char* FIREBASE_PROJECT_ID  = "barangay-management-syst-30c52";
static const char* FIRESTORE_BASE       = "https://firestore.googleapis.com/v1/projects/barangay-management-syst-30c52/databases/(default)/documents";

// Device credentials
static const char* DEVICE_EMAIL = "rfid@gmail.com";
static const char* DEVICE_PASSWORD = "rfid071204";

// Auth token
static String authToken = "";
static unsigned long tokenExpireTime = 0;

// Device metadata
static const char* DEVICE_NAME    = "ESP32-S3 RFID";
static String lastUserName        = "";
static String lastOfficialId      = "";  // Firestore document ID of matched official
static String lastOfficialName    = "";

// ====== PINS ======
static const uint8_t PIN_SS   = 10;  // SDA
static const uint8_t PIN_SCK  = 12;  // SCK
static const uint8_t PIN_MOSI = 11;  // MOSI
static const uint8_t PIN_MISO = 13;  // MISO
static const uint8_t PIN_RST  = 9;   // RST
static const uint8_t PIN_BUZZER = 8; // Buzzer (Change if connected to another pin)

static const uint32_t SCAN_COOLDOWN_MS = 2500;
static const uint32_t REGISTRATION_TIMEOUT_MS = 30000;

MFRC522 rfid(PIN_SS, PIN_RST);

static unsigned long lastScanAt = 0;
static String lastUid = "";
static bool isInRegistrationMode = false;
static unsigned long registrationStartedAt = 0;

// Explicitly setting I2C to match your current wiring
#define OLED_SDA 17
#define OLED_SCL 18

U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE, /* clock=*/ OLED_SCL, /* data=*/ OLED_SDA);

// ====== FUNCTIONS ======
static void displayMessage(const char* title, const char* msg) {
  u8g2.clearBuffer();
  
  // Header
  u8g2.setFont(u8g2_font_7x14_tr);
  u8g2.drawStr(0, 12, title);
  u8g2.drawLine(0, 15, 128, 15);

  // Body - Use a slightly smaller font for more characters
  u8g2.setFont(u8g2_font_6x12_tr);
  int y = 28;
  int lineHeight = 12;
  int maxChars = 21; // 128 / 6 = 21.3

  String text = String(msg);
  int start = 0;
  
  while(start < text.length() && y <= 64) {
    int nextNl = text.indexOf('\n', start);
    int end = (nextNl != -1) ? nextNl : text.length();
    String section = text.substring(start, end);
    section.trim();

    if (section.length() == 0 && nextNl != -1) {
      // Empty line (double newline)
      y += lineHeight;
    } else {
      while(section.length() > 0 && y <= 64) {
        String line;
        if (section.length() <= maxChars) {
          line = section;
          section = "";
        } else {
          int breakAt = section.lastIndexOf(' ', maxChars);
          if (breakAt == -1) breakAt = maxChars;
          line = section.substring(0, breakAt);
          section = section.substring(breakAt);
          section.trim();
        }
        u8g2.drawStr(0, y, line.c_str());
        y += lineHeight;
      }
    }

    if (nextNl != -1) start = nextNl + 1;
    else break;
  }
  u8g2.sendBuffer();
}

static String uidToHex(const MFRC522::Uid& uid) {
  String out;
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) out += '0';
    out += String(uid.uidByte[i], HEX);
  }
  out.toUpperCase();
  return out;
}

// ====== WIFI ======
static void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");
  displayMessage("WiFi", "Connecting...");
  int retry = 0;

  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.println(WiFi.localIP());
    displayMessage("WiFi Connect", "Success!");
  } else {
    Serial.println("\n⚠️ WiFi failed!");
    displayMessage("WiFi Connect", "Failed!");
  }
  delay(1000);
}

// ====== TIME ======
static void setupTime() {
  displayMessage("Time Sync", "Syncing NTP...");
  configTime(0, 0, "pool.ntp.org");

  // Philippines timezone
  setenv("TZ", "PST-8", 1);
  tzset();

  Serial.print("Syncing time");
  time_t now = time(nullptr);

  int retry = 0;
  while (now < 100000 && retry < 40) { // Bumped to 20 seconds
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    retry++;
  }

  if (now < 100000) {
    Serial.println("\n⚠️ Time sync failed!");
    displayMessage("Time Sync", "Failed!");
  } else {
    Serial.println("\n✅ Time synced!");
    displayMessage("Time Sync", "Success!");
  }
  delay(1000);
}

// Global WiFiClientSecure to prevent Out-Of-Memory SSL crashes
static WiFiClientSecure secureClient;

// ====== FIREBASE AUTH ======
static bool signInToFirebase() {
  displayMessage("Firebase", "Authenticating...");
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Firebase Auth Failed: No WiFi connection!");
    return false;
  }

  HTTPClient http;

  String url = String("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=")
               + FIREBASE_API_KEY;

  secureClient.stop(); // Drop any stale socket
  http.begin(secureClient, url);
  http.addHeader("Content-Type", "application/json");

  String payload = String("{")
    + "\"email\":\"" + DEVICE_EMAIL + "\","
    + "\"password\":\"" + DEVICE_PASSWORD + "\","
    + "\"returnSecureToken\":true"
    + "}";

  int code = http.POST(payload);
  String response = http.getString();
  http.end();

  if (code != 200) {
    Serial.println("❌ Firebase Auth Failed!");
    Serial.print("HTTP Code: ");
    Serial.println(code);
    if (code < 0) {
      Serial.print("Error String: ");
      Serial.println(http.errorToString(code));
      Serial.println("-> Try resetting the board manually to clear Network Memory.");
    } else {
      Serial.print("Response: ");
      Serial.println(response);
    }
    displayMessage("Firebase", "Auth Failed!");
    return false;
  }

  // Create a robust string extractor helper function locally
  auto extractJsonValue = [](const String& json, const String& key) -> String {
    int keyPos = json.indexOf("\"" + key + "\"");
    if (keyPos == -1) return "";
    int colonPos = json.indexOf(":", keyPos);
    if (colonPos == -1) return "";
    int quotePos = json.indexOf("\"", colonPos);
    if (quotePos == -1) return "";
    int endQuotePos = json.indexOf("\"", quotePos + 1);
    if (endQuotePos == -1) return "";
    return json.substring(quotePos + 1, endQuotePos);
  };

  authToken = extractJsonValue(response, "idToken");
  String expStr = extractJsonValue(response, "expiresIn");

  if (authToken.length() == 0) {
    Serial.println("❌ ERROR: Failed to parse idToken from Firebase response.");
    Serial.println(response);
    return false;
  }

  unsigned long expiresIn = expStr.toInt();
  if (expiresIn == 0) expiresIn = 3600;

  tokenExpireTime = millis() + (expiresIn * 1000) - 60000;

  Serial.println("✅ Firebase Auth Success! Token loaded.");
  displayMessage("Firebase", "Auth Success!");
  delay(1000);
  return true;
}

static void ensureTokenValid() {
  if (authToken.length() == 0 || millis() >= tokenExpireTime) {
    Serial.println("Refreshing/Getting token...");
    signInToFirebase();
  }
}

// Diagnostic helper to test Firestore access and view the officials schema
static void testFirestore() {
  Serial.println("\n--- FIRESTORE DIAGNOSTIC ---");
  if (authToken.length() == 0) {
    Serial.println("Error: No Auth Token!");
    return;
  }
  
  HTTPClient http;
  
  // Let's fetch ONE official from the database to see the exact field names
  String url = String(FIRESTORE_BASE) + "/officials?pageSize=1";
  
  secureClient.stop(); // Drop any stale socket
  http.begin(secureClient, url);
  http.addHeader("Authorization", "Bearer " + authToken);
  
  int code = http.GET();
  String response = http.getString();
  http.end();

  Serial.print("Diagnostic GET /officials code: "); Serial.println(code);
  if (code == 200) {
    Serial.println("✅ Firestore collection access successful!");
    Serial.println("SCHEMA SAMPLE (Look for the RFID field name here):");
    Serial.println(response);
  } else {
    Serial.print("❌ Firestore connection failed. Response: ");
    Serial.println(response);
  }
}

// ====== STRING EXTRACTOR ======
static String extractStringValue(const String& json, const String& fieldName) {
  int fieldsPos = json.indexOf("\"fields\"");
  int searchStart = (fieldsPos != -1) ? fieldsPos : 0;
  
  int fieldPos = json.indexOf("\"" + fieldName + "\"", searchStart);
  if (fieldPos == -1) return "";
  
  int svPos = json.indexOf("\"stringValue\"", fieldPos);
  if (svPos == -1) return "";
  
  int colonPos = json.indexOf(":", svPos);
  if (colonPos == -1) return "";
  
  int quotePos = json.indexOf("\"", colonPos);
  if (quotePos == -1) return "";
  
  int endQuotePos = json.indexOf("\"", quotePos + 1);
  if (endQuotePos == -1) return "";
  
  return json.substring(quotePos + 1, endQuotePos);
}

// ====== CHECK RFID REGISTERED (Firestore) ======
static bool isUIDRegistered(const String& uidHex) {
  Serial.println("\n--- FIRESTORE SCAN CHECK ---");
  Serial.print("Checking UID: "); Serial.println(uidHex);

  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  ensureTokenValid();
  
  if (authToken.length() == 0) {
    Serial.println("❌ ERROR: Auth token is empty! Authentication failed.");
    return false;
  }

  String collections[] = {"officials", "bhw", "tanod"};
  
  for (String coll : collections) {
    Serial.print("Searching collection: "); Serial.println(coll);
    
    HTTPClient http;
    String url = String(FIRESTORE_BASE) + ":runQuery";
    
    secureClient.stop();
    http.begin(secureClient, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + authToken);

    String query = String("{")
      + "\"structuredQuery\":{"  
      + "\"from\":[{\"collectionId\":\"" + coll + "\"}],"
      + "\"where\":{\"fieldFilter\":{"
      + "\"field\":{\"fieldPath\":\"rfidUid\"}," 
      + "\"op\":\"EQUAL\","
      + "\"value\":{\"stringValue\":\"" + uidHex + "\"}"
      + "}},\"limit\":1}}";

    int code = http.POST(query);
    String response = http.getString();
    
    // Fallback: If not found in uppercase, try lowercase (for old records)
    if (code == 200 && response.indexOf("\"document\"") == -1) {
      String uidLower = uidHex;
      uidLower.toLowerCase();
      if (uidLower != uidHex) {
        String queryLower = query;
        queryLower.replace("\"" + uidHex + "\"", "\"" + uidLower + "\"");
        code = http.POST(queryLower);
        response = http.getString();
      }
    }
    http.end();

    if (code != 200) {
      Serial.print("⚠️ Firestore Query Error ("); Serial.print(code); Serial.println(")");
      Serial.println("Response: " + response);
      continue; // Try next collection
    }

    if (response.indexOf("\"document\"") == -1) {
      // Not found in this collection
      continue;
    }

    // Found person!
    int namePos = response.indexOf("/" + coll + "/");
    if (namePos != -1) {
      namePos += coll.length() + 2;
      int nameEnd = response.indexOf('"', namePos);
      if (nameEnd != -1) lastOfficialId = response.substring(namePos, nameEnd);
    }

    lastOfficialName = extractStringValue(response, "officialName");
    if (lastOfficialName == "") lastOfficialName = extractStringValue(response, "name");
    if (lastOfficialName == "") lastOfficialName = extractStringValue(response, "firstName");
    if (lastOfficialName == "") lastOfficialName = "Unknown Member";

    lastUserName = lastOfficialName;
    Serial.print("✅ Member identified in "); Serial.print(coll); Serial.print(": "); Serial.println(lastOfficialName);
    return true;
  }

  Serial.println("❓ No matching person found in any collection.");
  lastUserName = "";
  lastOfficialId = "";
  lastOfficialName = "";
  return false;
}

// ====== SEND ATTENDANCE (Firestore) ======
static bool postAttendance(const String& uidHex) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  ensureTokenValid();
  if (authToken.length() == 0) return false;

  HTTPClient http;

  time_t now;
  time(&now);
  struct tm localTimeinfo;
  localtime_r(&now, &localTimeinfo);

  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &localTimeinfo);

  struct tm utcTimeinfo;
  gmtime_r(&now, &utcTimeinfo);

  // ISO 8601 timestamp for Firestore in UTC to fix AM/PM shifts
  char isoTime[25];
  strftime(isoTime, sizeof(isoTime), "%Y-%m-%dT%H:%M:%SZ", &utcTimeinfo);

  // Document ID: {date}_{officialDocId}
  String docId = String(dateStr) + "_" + lastOfficialId;
  String url = String(FIRESTORE_BASE) + "/attendance/" + docId;

  // Let's check if the attendance record already exists
  secureClient.stop();
  http.begin(secureClient, url);
  http.addHeader("Authorization", "Bearer " + authToken);
  int getCode = http.GET();
  String getResponse = http.getString();
  http.end();
  
  bool isAfternoon = (localTimeinfo.tm_hour >= 12);
  bool isCheckOut = false;
  
  String checkInField = isAfternoon ? "checkIn2" : "checkIn";
  String checkOutField = isAfternoon ? "checkOut2" : "checkOut";

  if (getCode == 200) {
    // Document exists, check if this session's check-in already happened
    if (getResponse.indexOf("\"" + checkInField + "\"") != -1) {
      isCheckOut = true;
    }
  }

  if (isCheckOut) {
    url += "?updateMask.fieldPaths=" + checkOutField + "&updateMask.fieldPaths=status";
  }

  secureClient.stop();
  http.begin(secureClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + authToken);

  String payload = String("{\"fields\":{");

  if (isCheckOut) {
    payload += "\"" + checkOutField + "\":{\"timestampValue\":\"" + String(isoTime) + "\"},";
    payload += "\"status\":{\"stringValue\":\"present\"}";
  } else {
    payload += "\"deviceUid\":{\"stringValue\":\"" + uidHex + "\"},"
      + "\"date\":{\"stringValue\":\"" + String(dateStr) + "\"},"
      + "\"" + checkInField + "\":{\"timestampValue\":\"" + String(isoTime) + "\"},"
      + "\"deviceName\":{\"stringValue\":\"" + String(DEVICE_NAME) + "\"},"
      + "\"status\":{\"stringValue\":\"present\"}";

    if (lastOfficialId.length() > 0) {
      payload += ",\"officialId\":{\"stringValue\":\"" + lastOfficialId + "\"}";
    }
    if (lastOfficialName.length() > 0) {
      payload += ",\"officialName\":{\"stringValue\":\"" + lastOfficialName + "\"}";
    }
  }

  payload += "}}";

  // PATCH creates or overwrites the document at the given path
  int code = http.PATCH(payload);
  const String body = http.getString();
  http.end();

  Serial.print("Attendance response code: "); Serial.println(code);
  Serial.println(body);

  return code >= 200 && code < 300;
}

// ====== UPDATE REGISTRATION MODE ======
static void setRegistrationMode(bool active) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  ensureTokenValid();
  if (authToken.length() == 0) return;

  HTTPClient http;
  String url = String(FIRESTORE_BASE) + "/system/device_config?updateMask.fieldPaths=registrationMode";

  secureClient.stop();
  http.begin(secureClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + authToken);

  String payload = String("{\"fields\":{\"registrationMode\":{\"booleanValue\":") + (active ? "true" : "false") + "}}}";
  
  int code = http.PATCH(payload);
  http.end();
  
  Serial.print("Set Registration Mode code: "); Serial.println(code);
  if (code >= 200 && code < 300) {
    isInRegistrationMode = active;
    if (active) registrationStartedAt = millis();
  }
}

// ====== CHECK REGISTRATION MODE ======
static void checkRegistrationStatus() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  ensureTokenValid();
  if (authToken.length() == 0) return;

  HTTPClient http;
  String url = String(FIRESTORE_BASE) + "/system/device_config";

  secureClient.stop();
  http.begin(secureClient, url);
  http.addHeader("Authorization", "Bearer " + authToken);

  int code = http.GET();
  String response = http.getString();
  http.end();

  if (code == 200) {
    int rmPos = response.indexOf("\"registrationMode\"");
    if (rmPos != -1) {
      int bvPos = response.indexOf("\"booleanValue\"", rmPos);
      if (bvPos != -1) {
        bool active = (response.indexOf("true", bvPos) != -1 && response.indexOf("true", bvPos) < response.indexOf("}", bvPos));
        if (active && !isInRegistrationMode) {
          Serial.println("🔄 Registration Mode ACTIVE");
          isInRegistrationMode = true;
          registrationStartedAt = millis();
        } else if (!active && isInRegistrationMode) {
          Serial.println("🔄 Registration Mode INACTIVE");
          isInRegistrationMode = false;
        }
      }
    }
  }
}

// ====== LOG SCANNED UID ======
static bool logScannedUid(const String& uidHex) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  ensureTokenValid();
  if (authToken.length() == 0) return false;

  HTTPClient http;
  String url = String(FIRESTORE_BASE) + "/rfidScans/latest";

  secureClient.stop();
  http.begin(secureClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + authToken);

  String payload = String("{\"fields\":{")
    + "\"uid\":{\"stringValue\":\"" + uidHex + "\"},"
    + "\"timestamp\":{\"timestampValue\":\"" + "2026-04-22T01:15:00Z" + "\"}"
    + "}}";
  
  int code = http.PATCH(payload);
  http.end();
  
  return code >= 200 && code < 300;
}

// ====== SETUP ======
void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // Configure global Secure Client for Google HTTPS APIs
  secureClient.setInsecure();

  if(!u8g2.begin()) {
    Serial.println(F("U8g2 Init failed. Check I2C wiring on pins 17 & 18!"));
  } else {
    displayMessage("System", "Starting Up...");
  }
  delay(1000);

  connectWiFi();
  setupTime();

  if (!signInToFirebase()) {
    Serial.println("⚠️ Firebase login failed, will retry...");
    displayMessage("System", "Ready - Auth Warn");
  } else {
    displayMessage("System", "Ready to Scan!");
    testFirestore(); // Dry run test
  }

  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_SS);
  rfid.PCD_Init();
  delay(100);

  // Check RFID chip is responding over SPI
  byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.print("MFRC522 Version: 0x");
  Serial.println(version, HEX);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("❌ RFID not detected! Check SPI wiring:");
    Serial.println("   SS=9, SCK=10, MOSI=11, MISO=12, RST=13");
    displayMessage("RFID Error", "Check SPI Wiring!");
  } else {
    Serial.println("✅ RFID Ready");
    displayMessage("System", "Ready to Scan!");
  }
}

// ====== LOOP ======
void loop() {
  // Check system mode every 3 seconds
  static unsigned long lastModeCheck = 0;
  if (millis() - lastModeCheck > 3000) {
    lastModeCheck = millis();
    checkRegistrationStatus();
    
    // Handle registration timeout
    if (isInRegistrationMode && (millis() - registrationStartedAt > REGISTRATION_TIMEOUT_MS)) {
      Serial.println("⏰ Registration Timeout!");
      displayMessage("Timeout", "Returning to\nAttendance...");
      setRegistrationMode(false);
      delay(2000);
      displayMessage("System", "Ready to Scan!");
    }
  }

  if (isInRegistrationMode) {
    displayMessage("REGISTRATION", "Place RFID card\nto capture UID...");
  }

  // Card detection logic
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // Beep 1 time on every scan
  digitalWrite(PIN_BUZZER, HIGH);
  delay(100);
  digitalWrite(PIN_BUZZER, LOW);

  String uid = uidToHex(rfid.uid);
  unsigned long now = millis();

  // Cooldown logic
  if ((now - lastScanAt < SCAN_COOLDOWN_MS) && uid == lastUid) {
    rfid.PICC_HaltA();
    return;
  }

  Serial.print("Card UID: ");
  Serial.println(uid);
  lastScanAt = now;
  lastUid = uid;

  if (isInRegistrationMode) {
    displayMessage("Capturing", ("UID: " + uid).c_str());
    if (logScannedUid(uid)) {
      Serial.println("✅ UID Logged to Firestore");
      displayMessage("Success!", ("Captured UID:\n" + uid).c_str());
      setRegistrationMode(false); // Reset mode after success
      delay(3000);
    } else {
      Serial.println("❌ Failed to log UID");
      displayMessage("Error", "Failed to capture!");
      delay(2000);
    }
    displayMessage("System", "Ready to Scan!");
  } else {
    // ATTENDANCE MODE
    displayMessage("Scanning", ("UID: " + uid).c_str());

    if (!isUIDRegistered(uid)) {
      Serial.println("❌ Card NOT REGISTERED!");
      displayMessage("Rejected", "Not Registered!");
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      delay(2000);
      displayMessage("System", "Ready to Scan!");
      return;
    }

    Serial.println("✅ Card Registered");
    String msgLines = "Sending...\nName:\n" + lastUserName;
    displayMessage("Processing", msgLines.c_str());

    if (postAttendance(uid)) {
      Serial.println("✅ Attendance Sent!");
      displayMessage("Success!", ("Recorded:\n" + lastUserName).c_str());
    } else {
      Serial.println("❌ Failed to send!");
      displayMessage("Error", "Failed to Send!");
    }

    delay(2000);
    displayMessage("System", "Ready to Scan!");
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}