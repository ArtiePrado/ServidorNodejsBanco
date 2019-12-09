//mutex----------------------------------------------------------------------------------------------
var locks = require('locks');
var mutex = locks.createMutex();

//conexao com mongodb------------------------------------------------------------------------------
const mongo = require('mongodb').MongoClient
const url = 'mongodb://localhost:27017'

var db;
var contas;
var transacoes;
mutex.lock(function () {
    mongo.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, (err, client) => {
        if(err){
            console.error(err)
            mutex.unlock();
            return
        }
        db = client.db('test');
        contas = db.collection('contas');
        transacoes = db.collection('transacoes');
        mutex.unlock();
    })
});

//operacoes-----------------------------------------------------------------------------------------
function abrirConta(dados){
    mutex.lock(function () {
        contas.insertOne({numero: dados.numero, saldoAtual: dados.saldoAtual,
        dataAbertura: dados.dataAbertura, status: dados.status }, (err, result) => {
            if(err){
                mutex.unlock();
                throw err;
            }
            console.log("conta nova criada = " + dados.numero);
            mutex.unlock();
        })
    });
}
function debitoConta(dados){
    mutex.lock(function () {
        contas.findOne({numero: dados.numero}, (err, conta) => {
            if(err){
                mutex.unlock();
                throw err;
            }
            if(conta.status != "Bloqueado"){
                transacoes.insertOne({dataHora: dados.dataHora, descricao: "Debito feito por " + dados.numero,
                valor: dados.valor}, (err, result) => {
                    if(err){
                        mutex.unlock();
                        throw err;
                    }
                    console.log("debito da conta " + dados.numero +  " armazenado");
                    var novoSaldo = conta.saldoAtual - dados.valor;
                    contas.updateOne({ "numero" : dados.numero }, { $set: { "saldoAtual" : novoSaldo}}, (err, result) => {
                        if(err){
                            mutex.unlock();
                            throw err;
                        }
                        console.log("conta " + dados.numero + " teve saldo atualizado");
                        mutex.unlock();
                    })
                })
            }else{
                console.log("debito negado, conta " + dados.numero +  " esta bloqueada");
                mutex.unlock();
            }
        })
    });
}
function creditoConta(dados){
    mutex.lock(function () {
        contas.findOne({numero: dados.numero}, (err, conta) => {
            if(err){
                mutex.unlock();
                throw err;
            }
            if(conta.status != "Bloqueado"){
                transacoes.insertOne({dataHora: dados.dataHora, descricao: "Credito feito por " + dados.numero,
                valor: dados.valor}, (err, result) => {
                    if(err){
                        mutex.unlock();
                        throw err;
                    }
                    console.log("credito da conta " + dados.numero +  " armazenado");
                    var novoSaldo = conta.saldoAtual + dados.valor;
                    contas.updateOne({ "numero" : dados.numero }, { $set: { "saldoAtual" : novoSaldo}}, (err, result) => {
                        if(err){
                            mutex.unlock();
                            throw err;
                        }
                        console.log("conta " + dados.numero + " teve saldo atualizado");
                        mutex.unlock();
                    })
                })
            }else{
                console.log("credito negado, conta " + dados.numero +  " esta bloqueada");
                mutex.unlock();
            }
        })
    });
}
function bloquearConta(dados){
    mutex.lock(function () {
        contas.findOne({numero: dados.numero}, (err, conta) => {
            if(err){
                mutex.unlock();
                throw err;
            }
            contas.updateOne({ "numero" : dados.numero}, { $set: { "status" : "Bloqueado"}}, (err, result) => {
                console.log("conta " + dados.numero + " bloqueada");
                mutex.unlock();
            })
        })
    });
}

//relatorio-----------------------------------------------------------------------------------------------------------
function montarRelatorio(){
    var createCsvWriter = require('csv-writer').createObjectCsvWriter;
    var csvWriter = createCsvWriter({
        path: 'relatorio.csv',
        header: [
            {id: 'numero', title: 'NUMERO'},
            {id: 'saldo', title: 'SALDO'}
        ]
    });
    mutex.lock(function () {
        contas.find().toArray((err, items) => {
            var dados = [];
            for(var i = 0; i < items.length; i++){
                dados[i] = {numero: items[i].numero, saldo: items[i].saldoAtual}
            }
            csvWriter.writeRecords(dados);
            mutex.unlock();
        })
    });
}

//conexao com cliente-------------------------------------------------------------------------------------------------
const net = require('net'),
    JsonSocket = require('json-socket');

const handleConnection = socket => {
    console.log('cliente conectado');
}

const port = 4001;
const server = net.createServer(handleConnection);
server.listen(port);
server.on('connection', function(socket) {
    socket = new JsonSocket(socket);
        socket.on('message', function(message) {
            try{
                var tipo = message.tipo;
                if(tipo == 'abertura'){
                    abrirConta(message);
                }else if (tipo == 'debito'){
                    debitoConta(message);
                }else if (tipo == 'credito'){
                    creditoConta(message);
                }else if (tipo == 'bloquear') {
                    bloquearConta(message);
                }else{
                    montarRelatorio();
                    socket.sendEndMessage({result: "pronto"});
                }
            }
            catch (e){
                console.log(e);
            }
        });
})
