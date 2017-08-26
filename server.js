const konfig = require('konfig')({ path: "./" });
const express = require('express');
const request = require('request');
const http = require('http');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const Forecast = require('forecast');
const translate = require('yandex-translate')(konfig.app.yandex);
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app).listen(konfig.app.port);
const  forecast = new Forecast({
  service: 'forecast.io',
  key: konfig.app.forecast,
  units: 'celcius',
  cache: true,
  ttl: {
      minutes: 42,
      seconds: 42
    }
});

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

console.log(`Server is up and running...`);
console.log(`   Port:   ${konfig.app.port}`);

var convert = {
  "USD": "US Dollar",
  "AUD": "Australian Dollar",
  "BGN": "Bulgarian Lev",
  "BRL": "Brazilian Real",
  "CAD": "Canadian Dollar",
  "CHF": "Swiss Franc",
  "CNY": "Chinese Yuan",
  "CZK": "Czech Republic Koruna",
  "DKK": "Danish Krone",
  "GBP": "British Pound",
  "HKD": "Hong Kong Dollar",
  "HRK": "Croatian Kuna",
  "HUF": "Hungarian Forint",
  "IDR": "Indonesian Rupiah",
  "INR": "Indian Rupee",
  "JPY": "Japanese Yen",
  "KRW": "South Korean Won",
  "MXN": "Mexican Peso",
  "MYR": "Malaysian Ringgit",
  "NOK": "Norwegian Krone",
  "NZD": "New Zealand Dollar",
  "PHP": "Philippine Peso",
  "PLN": "Polish Zloty",
  "RON": "Romanian Leu",
  "RUB": "Russian Ruble",
  "SEK": "Swedish Krona",
  "SGD": "Singapore Dollar",
  "THB": "Thai Baht",
  "TRY": "Turkish Lira",
  "ZAR": "South African Rand",
  "EUR": "Euro",
  "BTC": "Bitcoin",
};

var currencies = "Follow the example to convert USD to CAD:\n/cad 4 USD \n\nbtc - Bitcoin\nusd - US Dollar\neur - Euro\nrub - Russian Ruble\naud - Australian Dollar\nbgn - Bulgarian Lev\nbrl - Brazilian Real\ncad - Canadian Dollar\nchf - Swiss Franc\ncny - Chinese Yuan\nczk - Czech Republic Koruna\ndkk - Danish Krone\ngbp - British Pound\nhkd - Hong Kong Dollar\nhrk - Croatian Kuna\nhuf - Hungarian Forint\nidr - Indonesian Rupiah\ninr - Indian Rupee\njpy - Japanese Yen\nkrw - South Korean Won\nmxn - Mexican Peso\nmyr - Malaysian Ringgit\nnok - Norwegian Krone\nnzd - New Zealand Dollar\nphp - Philippine Peso\npln -  Polish Zloty\nron - Romanian Leu\nsek - Swedish Krona\nsgd - Singapore Dollar\nthb - Thai Baht\ntry - Turkish Lira\nzar - South African Rand";
var help = "Commands available: \n/define [term] - Make a Urban Dictionary search looking for a definition.\n/isup [URL] - See if the website is online.\n/weathernow - Get the currently weather.\n/translate [sentence] - Translate any language to english.\n/list - Convert any currency.\n\nCommands for Brazil:\n/brliof - Converta USD para Real com IOF.\n/traduzir [frase] - Qualquer idioma para Português.";
var acknowledgement = "The GypsyBot source code is available at [GitHub](https://github.com/luigifreitas/GypsyBot). Created by @luigifreitas :D";

app.post('/webhook', function(req, res){
  res.send("Thanks!");
  if (req.body.message != undefined) {
    var TelegramChatID = req.body.message.chat.id;
    if (req.body.message.text != undefined && req.body.message.reply_to_message == undefined) {
      var message = req.body.message.text.split(" ");
      var command = message[0];

      if (command == "/help" || command == "/help@GypsyBot" || command == "/start") {
        reply(TelegramChatID, help);
        reply(TelegramChatID, acknowledgement);
      } else if (command == "/define" || command == "/define@GypsyBot") {
        gypsyDefine(TelegramChatID, req.body.message.text);
      } else if (command == "/isup" || command == "/isup@GypsyBot") {
        gypsyIsup(TelegramChatID, req.body.message.text);
      } else if (command == "/weathernow" || command == "/weathernow@GypsyBot") {
        reply(TelegramChatID, "Sweet, reply this message with our location or city name.");
      } else if (command == "/translate" || command == "/translate@GypsyBot") {
        gypsyTranslateEN(TelegramChatID, req.body.message.text);
      } else if (command == "/hue" || command == "/hue@GypsyBot") {
        gypsyHue(TelegramChatID);
      } else if (command == "/list" || command == "/list@GypsyBot") {
        reply(TelegramChatID, currencies);
      } else if (command == "/brliof" || command == "/brliof@GypsyBot") {
        request({url: 'http://api.fixer.io/latest?base=USD', json: true}, function(err, res, json) {
          reply(TelegramChatID, "Agora " + message[1] + " dólares valem " + Math.round((parseFloat(message[1]) * json.rates["BRL"] * 100) * 1.0638) / 100 + " reais com IOF.");
        });
      } else if (command == "/traduzir" || command == "/traduzir@GypsyBot") {
        gypsyTranslatePT(TelegramChatID, req.body.message.text);
      } else {
        gypsyCurrency(TelegramChatID, req.body.message.text.toUpperCase().split(" "));
      }
    } else if (req.body.message.reply_to_message != undefined) {
      var originalMessage = req.body.message.reply_to_message;
      var message = req.body.message;

      if (originalMessage.text == "Sweet, reply this message with our location or city name.") {
        if (message.location != undefined) {
          gypsyWeather(TelegramChatID, req.body.message.location);

        } else {

          var queryString = {
            address:  message.text,
            sensor: false
          }

          request({url: "http://maps.googleapis.com/maps/api/geocode/json", qs: queryString}, function (err, body, data) {
            var response = JSON.parse(data);
            if (response.results != undefined) {
              var location = response.results[0].geometry.location;
              var address = response.results[0].formatted_address.split(" - ");

              reply(TelegramChatID, "Here is the weather of " + address[0] + ".");
              gypsyWeather(TelegramChatID, {latitude: location.lat, longitude: location.lng});
            } else {
              reply(TelegramChatID, "Ops, location not found. 😕");
            }
          });
        }
      }
    }
  }
});

app.get('/status', function(req, res){
  res.send("✅ GypsyBot is up!")
});

// MARK: - Main Functions.

function gypsyHue(TelegramChatID) {
  var rand = getRandomInt(0, 4)
  switch (rand) {
    case 0:
      reply(TelegramChatID, "HUEHUEHUE");
      break;
    case 1:
      reply(TelegramChatID, "HUEHUEHUEHUEHUEBRBR");
      break;
    case 2:
      reply(TelegramChatID, "BRBRBRBHUEHUE");
      break;
    case 3:
      reply(TelegramChatID, "HUEHUEHUE BR BR");
      break;
    case 4:
      reply(TelegramChatID, "HueHueHueBRRBBRB");
      break;
    default:
      reply(TelegramChatID, "HUEHUEHUEHUEHUEBRBR");
  }
}

function gypsyCurrency(TelegramChatID, message) {
  if (message[1] != undefined && message[0] != undefined && message[2] != undefined) {
    var to = message[2];
    var from = message[0].replace('/','');
    if (convert[to] != undefined && convert[from] != undefined) {
      if (from != "BTC" && to != "BTC") {
        request({url: 'http://api.fixer.io/latest?base=' + to, json: true}, function(err, res, json) {
          reply(TelegramChatID, "Now " + message[1] + " " + convert[to] + " is worth " + Math.round(parseFloat(message[1]) * json.rates[from] * 100) / 100 + " " + convert[from] + ".");
        });
      } else {
        if (to == "BTC") {
          request({url: 'https://api.blinktrade.com/api/v1/BRL/ticker?crypto_currency=BTC', json: true}, function(err, res, json) {
            var BTC =  parseFloat(message[1]) * json.buy;
            request({url: 'http://api.fixer.io/latest?base=BRL', json: true}, function(err, res, json) {
              if (json.rates[from] == undefined) {
                var BRL = BTC;
              } else {
                var BRL = json.rates[from] * BTC;
              }
              reply(TelegramChatID, "Now " + message[1] + " " + convert[to] + " is worth " + Math.round(BRL * 100) / 100  + " " + convert[from] + ".");
            });
          });
        } else {
          request({url: 'http://api.fixer.io/latest?base=' + to, json: true}, function(err, res, json) {
            if (json.rates["BRL"] == undefined) {
              var BRL = parseFloat(message[1]);
            } else {
              var BRL = json.rates["BRL"] * parseFloat(message[1]);
            }

            request({url: 'https://api.blinktrade.com/api/v1/BRL/ticker?crypto_currency=BTC', json: true}, function(err, res, json) {
              var BTC =  BRL / json.buy;
              reply(TelegramChatID, "Now " + message[1] + " " + convert[to] + " is worth " + BTC  + " " + convert[from] + ".");
            });
          });
        }
      }
    }
  }
}

function gypsyTranslatePT(TelegramChatID, Sentence) {
  var term = Sentence.replace('/traduzir','').replace('/traduzir@GypsyBot','');

  if (term.length > 1) {
    translate.translate(term, { to: 'pt' }, function(err, translation) {
      reply(TelegramChatID, translation.text);
    });
  } else {
    reply(TelegramChatID, "Frase não recohecida. 😕 \nUtilizagem: /traduzir _frase_");
  }
}

function gypsyTranslateEN(TelegramChatID, Sentence) {
  var term = Sentence.replace('/translate','').replace('/translate@GypsyBot','');

  if (term.length > 1) {
    translate.translate(term, { to: 'en' }, function(err, translation) {
      reply(TelegramChatID, translation.text);
    });
  } else {
    reply(TelegramChatID, "Sentence not recognized. 😕 \nUsage: /translate _sentence_");
  }
}

function gypsyIsup(TelegramChatID, Sentence) {
  var term = Sentence.replace('/isup','').replace('/isup@GypsyBot','');

  if (term.length > 1) {
    if (term.indexOf("HTTP://") == -1) {
      term = "http://" + term;
    }

    http.get(term, function (res) {
      replySticker(TelegramChatID, __dirname + '/stickers/' + getRandomInt(parseFloat(1), parseFloat(2))  + '.webp');
      reply(TelegramChatID, "This website is *up*.");
    }).on('error', function(e) {
      replySticker(TelegramChatID, __dirname + '/stickers/3.webp');
      reply(TelegramChatID, "This website is *down*.");
    });
  } else {
    reply(TelegramChatID, "URL not recognized. 😕 \nUsage: /isup _url_");
  }
}

function gypsyDefine(TelegramChatID, Sentence) {
  var term = Sentence.replace('/define','').replace('/define@GypsyBot','');

  if (term.length > 1) {
    var options = {
        uri: 'http://api.urbandictionary.com/v0/define?term=' + term,
        method: 'GET'
    };
    request(options, function (error, response, body) {
        var response = JSON.parse(body);
        if (response.result_type != "no_results") {
          reply(TelegramChatID, response.list[0].definition + " \n`Provided by UrbanDictionary.`");
        } else {
          reply(TelegramChatID, "Not Found. 😕");
        }
    });
  } else {
    reply(TelegramChatID, "Sentence not recognized. 😕 \nUsage: /define _term_");
  }
}

function gypsyWeather(TelegramChatID, Location) {
  forecast.get([Location.latitude, Location.longitude], function(err, weather) {
    if (!err) {
      var path = __dirname + '/stickers/' + weather.currently.icon + '.webp';
      var weather = weather.currently.summary + "\nTemperature: " + weather.currently.temperature.toFixed(2) + "°C" + "\nHumidity: " + (weather.currently.humidity * 100).toFixed(2) + "%";
      replySticker(TelegramChatID, path);
      reply(TelegramChatID, weather);
    } else {
      reply(TelegramChatID, "Sorry, something bad happend. 😞");
    }
  });
}

// MARK: - Core Functions.

function replySticker(TelegramChatID, Path) {
  var formData = {
    chat_id: TelegramChatID,
    sticker: fs.createReadStream(Path)
  };
  request.post({url:'https://api.telegram.org/bot' + konfig.app.telegram + '/sendSticker', formData: formData}, function(err, httpResponse, body){
    var response = JSON.parse(body);
    if (!response.ok) {
      reply(TelegramChatID, "Sorry, something bad happend. 😞");
    }
  });
}

function replyImage(TelegramChatID, Path) {
  var formData = {
    chat_id: TelegramChatID,
    photo: fs.createReadStream(Path)
  };
  request.post({url:'https://api.telegram.org/bot' + konfig.app.telegram + '/sendPhoto', formData: formData}, function(err, httpResponse, body){
    var response = JSON.parse(body);
    if (!response.ok) {
      replyFile(TelegramChatID, Path);
    }
  });
}

function replyFile(TelegramChatID, Path) {
  var formData = {
    chat_id: TelegramChatID,
    document: fs.createReadStream(Path)
  };
  request.post({url:'https://api.telegram.org/bot' + konfig.app.telegram + '/sendDocument', formData: formData}, function(err, httpResponse,body){
    var response = JSON.parse(body);
    if (!response.ok) {
      reply(TelegramChatID, "Sorry, something bad happend. 😞");
    }
  });
}

function reply(TelegramChatID, Sentence) {
  var formData = {
    chat_id: TelegramChatID,
    parse_mode: "Markdown",
    text: Sentence
  };
  request.post({url:'https://api.telegram.org/bot' + konfig.app.telegram + '/sendMessage', formData: formData});
}

// MARK: - Basic Functions.

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
