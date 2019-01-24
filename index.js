const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const Ingredient = require('./models/ingredient');
const Cocktail = require('./models/cocktail');

require('dotenv').config();

const app = express();

// Configure app for bodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Allows connections from external sources
app.use(cors());
// Set up port for server to listen on
const port = process.env.PORT || 3000;

// Connect to DB
mongoose.connect(process.env.mongoURI, { useNewUrlParser: true, useCreateIndex: true })

// API Routes
const router = express.Router();

// Prefix routes with /api/chinchin
app.use('/api/chinchin', router);


router.post('/ingredients/add', (req, res) =>{
  var newIngredient = new Ingredient();
  newIngredient._id = req.body._id;
  newIngredient.name = req.body.name;
  newIngredient.abv = req.body.abv;
  newIngredient.taste = req.body.taste;

  newIngredient.save((err) =>{
    if (err){
      res.send(err);
    }
    res.json({ message: 'Ingredient added successfully' });
  })
})

router.post('/cocktails/add', (req, res) =>{
  var newCocktail = new Cocktail();
  newCocktail.name = req.body.name;
  newCocktail.category = req.body.category;
  newCocktail.glass = req.body.glass;
  newCocktail.ingredients = req.body.ingredients;
  newCocktail.garnish = req.body.garnish;
  newCocktail.preparation = req.body.preparation;

  newCocktail.save((err) =>{
    if (err){
      res.send(err);
    }
    res.json({ message: 'Cocktail added successfully' });
  })
})

router.post('/ingredients/add-many', (req, res) => {
  Ingredient.insertMany(req.body.ingredientsList, (err) => {
    if (err){
      res.send(err);
    }
    res.json({ message: 'Ingredients added successfully' });
  });
})

router.post('/cocktails/add-many', (req, res) => {
  Cocktail.insertMany(req.body.cocktailsList, (err) => {
    if (err){
      res.send(err);
    }
    res.json({ message: 'Cocktails added successfully' });
  });
})

router.get('/cocktails/ingredient/:ingredientName', (req, res) => {
  Ingredient.find({name: req.params.ingredientName}, (err, ingredient) => {
    if (err){
      res.send(err);
    }
  Cocktail.
    find({ ingredients: { $elemMatch: { ingredient: ingredient[0]._id }}}).
    populate({ path: 'ingredients.ingredient', select: 'name -_id' }).
    exec((err, cocktails) => {
      if (err){
        res.send(err);
      }
      res.json(cocktails);
    })
  })
})

router.get('/cocktails/filter/by-ingredient/:ingredients/:maxMissing?', (req, res) => {
  let ingredientsList = req.params.ingredients.split(',');
  let maxMissing = req.params.maxMissing;

  Ingredient.
    find({name: { $in: ingredientsList }}, {_id: true}).
    exec((err, ingredients) => {
      if (err){
        res.send(err);
      }
      let ingredientIds = ingredients.map(function(ingredient) {
        return ingredient._id;
      })
    Cocktail.
      find({ ingredients:
        { $elemMatch:
          { ingredient:
            { $in: ingredientIds }
          }
        }
      },
      {
        name: true,
        pictureUrl: true,
        ingredients: true,
        _id: false
      }).
      populate({ path: 'ingredients.ingredient', select: 'name -_id'}).
      exec((err, cocktails) => {
        if (err){
          res.send(err);
        }

        let results = cocktails.map(function(cocktail) {

          cocktail = cocktail.toObject();
          cocktail.missingCount = 0;

          cocktail.ingredients = cocktail.ingredients.map(function(item) {
            if (!ingredientsList.includes(item.ingredient.name)) {
              cocktail.missingCount += 1;
            }
            return item.ingredient.name;
          });

          if (!maxMissing || cocktail.missingCount <= req.params.maxMissing) {
            return cocktail;
          }

        })

        let filteredResults = results.filter(function (element) {
          return element != null;
        });

        res.json(filteredResults);
    })
  })
})

router.get('/cocktails/id/:cocktailId', (req, res) => {
  Cocktail.
    findById(req.params.cocktailId).
      populate({ path: 'ingredients.ingredient', select: 'name -_id'}).
      exec((err, cocktail) => {
        if (err) {
          res.send(err);
        }
        res.json(cocktail);
  })
})

router.get('/cocktails/all', (req, res) => {
  Cocktail.
    aggregate([
      {
        $project: {
          name: true,
          pictureUrl: true,
          _id: false
        }
      }
    ])
    .exec((err, cocktail) => {
    if (err) {
      res.send(err);
    }
    res.json(cocktail);
  })
})

router.get('/cocktails/name/:cocktailName', (req, res) => {
  Cocktail.find({ name: req.params.cocktailName }).
    populate({ path: 'ingredients.ingredient', select: 'name abv taste -_id' }).
    exec((err, cocktail) => {
      if (err) {
      res.send(err);
      }
      res.json(cocktail);
    })
})

router.get('/cocktails/filter/by-cocktail/:namesList', (req, res) => {
  let namesList = req.params.namesList.split(',');
  Cocktail.aggregate([
      {
        $match: { name: { '$in': namesList } }
      }
    ]).
    exec((err, cocktails) => {
      if(err) {
        res.send(err);
      }
      res.json(cocktails);
    })
})

router.get('/ingredients/:ingredientName', (req, res) => {
  Ingredient.find({name: req.params.ingredientName}, (err, ingredient) => {
    if (err){
      res.send(err);
    }
    res.json(ingredient);
  })
})

app.get('/', (req, res) => {
  res.render('index.ejs')
})

app.listen(port);
console.log(`Server is listening on port ${port}`);
