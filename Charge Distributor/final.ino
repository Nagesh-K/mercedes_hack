
#include <LiquidCrystal.h>
#include <SoftwareSerial.h>
#include <String.h>

SoftwareSerial mySerial(10, 11); // RX, TX
LiquidCrystal lcd(A4, A3, 9, 8, 7, 6);


#define INTC 2  //INT0
#define INTD 3  //INT1
#define POLC 4  //measure polarity
#define POLD 5  //measure polarity

#define RelayToReceive A0
#define RelayToDischarge A1
#define RelayToDrive A2

//String data ="";
char character,mode[2],chargetransfer[4];

volatile double currentcharge = 0;
volatile double charge = 0;
volatile double battery_mAh = 10000.0; // milliamp-hours (mAh)
volatile double battery_percent = 100.0;  // state-of-charge (percent)

volatile boolean isrflag;
volatile long int timec, lasttime,timed,timerand1,timerand2,diff=0;
volatile double mA;
int power=1000;
double ah_quanta = 0.17067759; // mAh for each INT
double percent_quanta; // calculate below

void setup()
{
  // Set up I/O pins:
  
  pinMode(INTC,INPUT_PULLUP); // Interrupt input pin (must be D2 or D3)

  pinMode(INTD,INPUT_PULLUP);

  pinMode(POLC,INPUT); // Polarity input pin
  pinMode(POLD,INPUT);

  pinMode(RelayToReceive,OUTPUT); // relay to car meant for chraging
  digitalWrite(RelayToReceive,HIGH);
  
  pinMode(RelayToDischarge,OUTPUT);// Enable serial output:
  digitalWrite(RelayToDischarge,LOW);
  
  pinMode(RelayToDrive,OUTPUT);
  digitalWrite(RelayToDrive,HIGH);

  Serial.begin(9600); // not for lcd
  
  mySerial.begin(38400); // for bluetooth

  //Serial.println("test ");

  percent_quanta = 1.0/(battery_mAh/1000.0*5859.0/100.0); // One INT is this many percent of battery capacity:

  isrflag = false;
  
  attachInterrupt(0,chargeISR,FALLING);
  attachInterrupt(1,dischargeISR,FALLING);

  lcd.begin(16, 2);
  // Print a message to the LCD.
  //lcd.print("MERC HACK!");
  
}

void loop()
{
  
  //Serial.print("yes");
  int i=0;
  static int n = 0;

    lcd.setCursor(0,0);
    lcd.print("DRIVING");
  
    
  if(mySerial.available())
  {
    String data ="";
       while(mySerial.available())
        {
          character = mySerial.read();
          data=data+character;
          Serial.print(character);
        
         }
       
  for(i=0;i<1;i++)
    {  
      mode[i]=data[i];
    }
  for(i=1;i<5;i++)
    {
      chargetransfer[i-1]=data[i];
      charge += (chargetransfer[i-1]-48)*power;
      power /= 10;
    }
      Serial.println(charge);
      
      currentcharge=battery_mAh;
      
   if (mode[0]=='?')
        {
          //Serial.print(mode[i]);
          char str[6]="";
          //long int abc = battery_mAh;
          
            for (i=0;i<5;i++){
              //str[i]=(abc%10)+48;
              str[4-i]=((int)currentcharge%10)+48;
              currentcharge=currentcharge/10;
            Serial.println(str[4-i]);
            }
            str[5]='\0';
            mySerial.write(str);
            character=0;
         }
  else if( mode[0]=='C')
  {  
    digitalWrite(RelayToDischarge,HIGH);
    Serial.println("CH");
    lcd.setCursor(0,0);
    lcd.print("CHARGING");
    //lcd.setCursor(0,1);
    //lcd.print(charge);
    //lcd.print("mAh");
    //while(battery_mAh<=(currentcharge+(charge/50)))
    while(diff<(charge*5*5*1000))
      {
        timerand1=millis();
        digitalWrite(RelayToReceive,LOW);
        Serial.println(diff);
        timerand2=millis();
        diff+=timerand2-timerand1;
      }
    digitalWrite(RelayToReceive,HIGH);
    digitalWrite(RelayToDischarge,LOW);
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("CHARGING DONE");
    delay(3000);
    lcd.clear();
  }
  else if(mode[0]=='D')
  {
    Serial.println("DH");
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("DISCHARGING");
    //lcd.setCursor(0,1);
    //lcd.print(charge);
    //lcd.print("mAh");
    while(battery_mAh>=(currentcharge-charge))
      {
        digitalWrite(RelayToDrive,LOW);
      }
    digitalWrite(RelayToDrive,HIGH);
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("DISCHARGING DONE");
    delay(3000);
    lcd.clear();
   }
   power=1000;
   charge=0;
 }
 
 
}

void chargeISR() // Run automatically for falling edge on D2 (INT0)
{
  static boolean polarity;
  
  lasttime = timec;  // Determine delay since last interrupt (for mA calculation)
  timec = micros();

  // Get polarity value 

  polarity = digitalRead(POLC);
  if (polarity) // high = charging
  {
    battery_mAh += ah_quanta;
    battery_percent += percent_quanta;
  }
  else // low = discharging
  {
    battery_mAh -= ah_quanta;
    battery_percent -= percent_quanta;
  }

  // Calculate mA from time delay (optional)

  mA = 614.4/((timec-lasttime)/1000000.0);

  // If charging, we'll set mA negative (optional)
  
  if (polarity) mA = mA * -1.0;
  
  // Set isrflag so main loop knows an interrupt occurred
  
  isrflag = true;
  if (isrflag)
  {
    // Reset the flag to false so we only do this once per INT
    
    isrflag = false;

    // Print out current status (variables set by myISR())
    
    Serial.print(" CHARGING ");
    Serial.print("mAh: ");
    Serial.print(battery_mAh);
    Serial.print(" soc: ");
    Serial.print(battery_percent);
    Serial.print("% time: ");
    Serial.print((timec-lasttime)/1000000.0);
    Serial.print("s mA: ");
    Serial.println(mA);

   // lcd.setCursor(0,0);
    //lcd.print("CHARGING");
  }
  
}

void dischargeISR() // Run automatically for falling edge on D3 (INT1)
{
  static boolean polarity;
  
  lasttime = timed;  // Determine delay since last interrupt (for mA calculation)
  Serial.println(lasttime);
  timed = micros();
  Serial.println(timed);

  // Get polarity value 

  polarity = digitalRead(POLD);
  if (polarity) // high = charging
  {
    battery_mAh += ah_quanta;
    battery_percent += percent_quanta;
  }
  else // low = discharging
  {
    battery_mAh -= ah_quanta;
    battery_percent -= percent_quanta;
  }

  // Calculate mA from time delay (optional)

  mA = 614.4/((timed-lasttime)/1000000.0);

  // If charging, we'll set mA negative (optional)
  
  if (polarity) mA = mA * -1.0;
  
  // Set isrflag so main loop knows an interrupt occurred
  
  isrflag = true;
  if (isrflag)
  {
    // Reset the flag to false so we only do this once per INT
    
    isrflag = false;

    // Print out current status (variables set by myISR())

    Serial.print(" DISCHARGING ");
    Serial.print("mAh: ");
    Serial.print(battery_mAh);
    Serial.print(" soc: ");
    Serial.print(battery_percent);
    Serial.print("% time: ");
    Serial.print((timed-lasttime)/1000000.0);
    Serial.print("s mA: ");
    Serial.println(mA);

    //lcd.setCursor(0,0);
    //lcd.print("DISCHARGING");
  }
  
}
