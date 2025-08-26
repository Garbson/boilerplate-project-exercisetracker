const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');

// --- Configuração Básica ---
const port = process.env.PORT || 3000;

// Conexão com o Banco de Dados MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// --- Middlewares ---
app.use(cors())
app.use(express.urlencoded({ extended: true })); // Para analisar dados de formulários
app.use(express.static('public'))

// Rota para a página inicial
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// --- Modelos (Schemas) do Mongoose ---

// Schema para o Usuário
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Schema para o Exercício
const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// ------------------------------------------------------------------
// ----> INÍCIO DA LÓGICA DOS ENDPOINTS DA API <----

// 1. Endpoint para criar um novo usuário
app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Could not create user' });
  }
});

// Endpoint para obter a lista de todos os usuários
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve users' });
  }
});

// 2. Endpoint para adicionar um exercício a um usuário
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    const savedExercise = await newExercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not add exercise' });
  }
});

// 3. Endpoint para obter o log de exercícios de um usuário
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let dateFilter = {};
    if (from) {
      dateFilter['$gte'] = new Date(from);
    }
    if (to) {
      dateFilter['$lte'] = new Date(to);
    }

    let query = Exercise.find({ userId: userId });

    if (from || to) {
      query = query.where('date').equals(dateFilter);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const exercises = await query.exec();

    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log
    });

  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve logs' });
  }
});


// ----> FIM DA LÓGICA DOS ENDPOINTS DA API <----
// ------------------------------------------------------------------

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
