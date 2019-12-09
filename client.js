const net = require('net'),
    JsonSocket = require('json-socket');

const port = 4001; //The same port that the server is listening on
const host = '127.0.0.1';
const socket = new JsonSocket(new net.Socket()); //Decorate a standard net.Socket with JsonSocket
socket.connect(port, host);
socket.on('connect', function() { //Don't send until we're connected
    socket.sendMessage({tipo: 'abertura', numero: 1, saldoAtual: 300, dataAbertura: new Date(), status: "Normal" });
    socket.sendMessage({tipo: 'abertura', numero: 2, saldoAtual: 100, dataAbertura: new Date(), status: "Normal" });
    socket.sendMessage({tipo: 'abertura', numero: 3, saldoAtual: 150, dataAbertura: new Date(), status: "Normal" });
    socket.sendMessage({tipo: 'abertura', numero: 4, saldoAtual: 250, dataAbertura: new Date(), status: "Normal" });
    socket.sendMessage({tipo: 'debito', numero: 2, dataHora: new Date(), valor: 200});
    socket.sendMessage({tipo: 'bloquear', numero: 2});
    socket.sendMessage({tipo: 'credito', numero: 1, dataHora: new Date(), valor: 100});
    socket.sendMessage({tipo: 'credito', numero: 2, dataHora: new Date(), valor: 200});
    socket.sendMessage({tipo: 'debito', numero: 1, dataHora: new Date(), valor: 150});
    socket.sendMessage({tipo: 'credito', numero: 3, dataHora: new Date(), valor: 150});
    socket.sendMessage({tipo: 'fim'});
    //socket.sendMessage({tipo: 'abertura', numero: 3, saldoAtual: 500, dataAbertura: new Date(), status: "Normal" });
    socket.on('message', function(message) {
        console.log(message.result);
    });
});
