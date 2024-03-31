const Express = require('express');
const CORS = require('cors');
const UserModel = require('./models/UserSchema');
const ExerciseModel = require('./models/ExerciseSchema');
const LogModel = require('./models/LogSchema');
require('dotenv').config();
const db = require('./config/db.config');

const App = Express();

App.use(CORS());
App.use(Express.urlencoded({ extended: false }));
App.use(Express.json());
App.use(Express.static('public'));

App.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Save a user in the database
App.post('/api/users', async (req, res) => {
  try {
    const user = new UserModel({ username: req.body.username });
    const newUser = await user.save();
    res.json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
App.get('/api/users', async (req, res) => {
  try {
    const allUsers = await UserModel.find();
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save exercises for the specified user
App.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  try {
    const user = await UserModel.findById(_id);
    if (!user) throw new Error('User not found');

    const date = req.body.date ? new Date(req.body.date) : new Date();
    const exercise = new ExerciseModel({
      user_id: user._id,
      username: user.username,
      description: req.body.description,
      duration: req.body.duration,
      date: date,
    });

    const newExercise = await exercise.save();

    let log = await LogModel.findById(user._id);
    if (!log) {
      log = new LogModel({
        _id: user._id,
        username: user.username,
        count: 0,
        log: [],
      });
    }

    log.count++;
    log.log.push({
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date,
    });

    await log.save();

    res.json({
      _id: newExercise.user_id,
      username: newExercise.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: new Date(newExercise.date).toDateString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Access all logs of any user
App.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const log = await LogModel.findById(req.params._id);
    if (!log) throw new Error('User Log Not Found');

    const logObj = log.log.map((obj) => ({
      description: obj.description,
      duration: obj.duration,
      date: new Date(obj.date).toDateString(),
    }));

    res.json({
      _id: log._id,
      username: log.username,
      count: log.count,
      log: logObj,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3358;
App.listen(PORT, () => {
  console.log(`Your App is Listening at http://localhost:${PORT}`);
  db.connectDB(); // Connect to MongoDB
});
