//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require('express-session');
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

// const bcrypt = require("bcrypt");
// const saltRounds = 10;
// const md5 = require("md5");
// const encrypt = require("mongoose-encryption");

const app = express();

// console.log(process.env.SECRET);

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret:"Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
//connect to database
// mongodb://localhost:27017/
// mongodb://127.0.0.1:27017/
mongoose.set('strictQuery', false);

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: Array
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
))
         
app.get("/", function(req, res) {
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/register", function(req, res) {
    res.render("register");
});

app.get("/logout", function(req, res ) {
    req.logout(function(err) {
      if (err) { 
        console.log(err);
       }else{
      res.redirect('/');
       }
    });
  });

app.get("/secrets", function(req, res) {
   User.find({"secret": {$ne: null}}, function(err, foundUsers) {
    if(err){
        console.log(err);
    }else{
        if(foundUsers){
            res.render("secrets", {usersWithSecrets: foundUsers});
            
        }
    }

   });
});

app.get("/submit", function(req, res) {
    if(req.isAuthenticated()){
        res.render("submit");
    }else{

        res.redirect("/login");
    }
});

app.post("/submit", function(req, res) {
    const summitedSecret = req.body.secret;
    // console.log(req.user.id);
    User.findById(req.user.id, function(err, foundUser) {
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = summitedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
});

// app.post("/submit", (req, res) => {
//     const submittedSecret = req.body.secret;
 
//     User.findById(req.user._id, (err, foundUser) => {
//         if (err) {
//             console.log(err);
//         } else {
 
//             if (foundUser) {
//                 User.updateOne(
//                     { _id: req.user._id },
//                     { $push: { secret: submittedSecret } },
//                     (err, result) => {
//                         if (err) {
//                             console.log(err);
//                         } else {
//                             res.redirect("/secrets");
//                         }
//                     }
//                 );
//             }
//         }
//     });
// });

app.post("/register", function(req, res) {
    User.register({username: req.body.username}, req.body.password, function(err, user) {
   
    if(err){
        console.log(err);
        res.redirect("/register");
    }else{
        passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
        });
     }
  });
});

app.post("/login", function(req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });    
});



app.listen(3000, function() {
    console.log("Server started on port 3000 http://localhost:3000/");
});