#define GREEN_LED 25
#define YELLOW_LED 26
#define RED_LED 27
#define BUZZER 14

void setup() {

  Serial.begin(115200);

  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  Serial.println("================================");
  Serial.println("ALERT OUTPUT MODULE TEST");
  Serial.println("================================");
}

void loop() {

  // SAFE
  Serial.println("STATE: SAFE");

  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  delay(3000);


  // CAUTION
  Serial.println("STATE: CAUTION");

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, HIGH);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  delay(3000);


  // HIGH RISK
  Serial.println("STATE: HIGH RISK");

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, HIGH);

  digitalWrite(BUZZER, HIGH);

  delay(3000);


  // Everything OFF
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  delay(1000);
}