require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const https=require("https");
const fetch = require('node-fetch');

//const convertUTC = require(__dirname + "/usermodule/utcdate.js");

const apiID = process.env.API_KEY;
const units = process.env.API_UNITS;
const lang = process.env.API_LANGUE;
const currentBaseURL= process.env.CURRENT_BASE_URL
const forecastBaseURL=process.env.FORECAST_BASE_URL
const options= "&lang="+lang + "&units=" + units + "&appid=" + apiID;

let  city = process.env.API_CITY;


function fetchJSON(url) {
    return fetch(url).then(response => response.json());
}

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');


// get request

let day='today';

app.get("/", function(req, res) {
   let currentURL=currentBaseURL+"?q="+city+options
   let forecastURL=forecastBaseURL+"?q="+city+options
   let urls = [currentURL,forecastURL];
   let promises = urls.map(url => fetchJSON(url));
   //console.log(promises);
   Promise.all(promises).then(function(responses){
    //console.log(promises);
    //console.log("before render");
    //console.log(responses);
    //console.log(currentURL);
    if (responses[0].cod==200 && responses[1].cod==200){

        //res.send(responses[0]);
        res.render('weather',{data:responses,day:day,city:city});
    } else {
      res.render("error",{data:responses,city:city});

    }
  })
});

app.get("/location",function(req,res){
   res.render('location',{city:city})
});
// post request

app.post("/",function(req,res){
    console.log(req.body);
    day = req.body.button;
    city=req.body.city.replace(' ','%20');
    console.log("=============",day,city)
    res.redirect("/");

});

// start Server

app.listen(3000, function() {

  console.log("Server is running on port 3000.");

});
