const express = require("express")
const path = require("path")
const {open} = require("sqlite")
const sqlite3 = require("sqlite3") 
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const dbPath = path.join(__dirname, "todos-application.db")
const app = express()
app.use(express.json()); 

let db = null;

const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename:dbPath,
            driver:sqlite3.Database
        })
        app.listen(3000, () => {
            console.log("Server Running at http://localhost:3000/")
        })
    } catch (e){
        console.log(`DB Error: ${e.message}`)
        process.exit(1)
    }
} 

initializeDBAndServer() 

// APIs or Network Calls and Authentication Process 

// Authentication and Authorization  

app.post("/users/", async (request, response) => {
    const {username, password, email} = request.body
    const hashedPassword = await bcrypt.hash(password, 10)
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
        const createUserQuery = `
        INSERT INTO 
            users (username, password, email) 
        VALUES 
        (
            '${username}', 
            '${hashedPassword}',
            '${email}'
        )`;
        const dbResponse = await db.run(createUserQuery);
        const newUserId = dbResponse.lastID;
        response.send(`Created new user with ${newUserId}`);
      } else {
        response.status = 400;
        response.send("User already exists");
      }
}) 

// Login API 

app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        const payload = {
          username: username,
        };
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid Password");
      }
    }
  });


// Authenticate Token Middleware 

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.username = payload.username;
          next();
        }
      });
    }
  };

// API (GET) 1 

app.get("/todos/", authenticateToken, async (request, response) => {
    const getTodoQuery = `
    SELECT 
    *
    FROM 
    todos 
    ORDER BY 
    id;`; 
    const todosArray = await db.all(getTodoQuery)
    response.send(todosArray)
}) 

// API (GET) Specific todo 2 

app.get("/todos/:id/", authenticateToken, async (request, response) => {
    const {id} = request.params
    //const id = uuidv4();
    const getTodosQuery = `
    SELECT 
    *
    FROM 
    todos 
    WHERE 
    id = ${id};`;
    const todo = await db.get(getTodosQuery)
    response.send(todo)
}) 

// API (POST) Add Todo 3 

app.post("/todos/", async (request, response) => {
    const todosDetails = request.body;
    const {title, description, status} = todosDetails 
    const addTodosQuery = `
    INSERT INTO todos (title, description, status) 
    VALUES ('${title}', '${description}', '${status}');
    `; 
    const dbResponse = await db.run(addTodosQuery)
    response.send("Todo Item Added Successfully")
}); 

// API (PUT) Update Todo 4 

app.put("/todos/:id", async (request, response) => {
    const {id} = request.params 
    const todosDetails = request.body 
    const {title, description, status} = todosDetails
    const updateTodoQuery = `
    UPDATE 
    todos 
    SET 
    title='${title}',
    description='${description}',
    status='${status}' 
    WHERE 
    id = ${id};
    `;
    await db.run(updateTodoQuery)
    response.send("Todo Item Updated Successfully")
}) 

app.delete("/todos/:id", async (request, response) => {
    const {id} = request.params 
    const deleteTodoItem = `
    DELETE FROM
    todos 
    WHERE 
    id = '${id}';`; 
    await db.run(deleteTodoItem)
    response.send("Todo Item Deleted Successfully")
})