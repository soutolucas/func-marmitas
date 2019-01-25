'use strict';

const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp();
const firestore = admin.firestore();

const PEDIDOS = 'pedidos';
const LOCAIS = 'locais';
const PRATOS = 'pratos';
const ACOMPANHAMENTOS = 'acompanhamentos';

const fixReturn = (response) => {
    const arr = [];
    response.forEach(doc => arr.push(doc.data()));
    return arr;
}

exports.getPratoDia = functions.https.onCall(async () => {
    const pedido = await pedidoOpen();

    if (pedido === []) {
        return null;
    } else {
        const local = await firestore
            .collection(LOCAIS)
            .orderBy("name")
            .get()
            .then(fixReturn);

        const pratos = await firestore
            .collection(PRATOS)
            .orderBy("price")
            .get()
            .then(fixReturn);

        const acompanhamentos = await firestore
            .collection(ACOMPANHAMENTOS)
            .orderBy("name")
            .get()
            .then(fixReturn);

        return {
            pedido,
            local,
            pratos,
            acompanhamentos
        }
    }
});

exports.getAcompanhamentos = functions.https.onCall(() => {
    return firestore
        .collection(ACOMPANHAMENTOS)
        .orderBy('name')
        .get()
        .then(querySnapshot => {
            let arr = [];
            querySnapshot.forEach(doc => arr.push(doc.data()));
            return arr;
        });
});

exports.getPratos = functions.https.onCall(() => {
    return firestore
        .collection(PRATOS)
        .orderBy('price')
        .get()
        .then(querySnapshot => {
            let arr = [];
            querySnapshot.forEach(doc => arr.push(doc.data()));
            return arr;
        });
});

exports.getLocais = functions.https.onCall(() => {
    return firestore
        .collection(LOCAIS)
        .orderBy('name')
        .get()
        .then(querySnapshot => {
            let arr = [];
            querySnapshot.forEach(doc => arr.push(doc.data()));
            return arr;
        });
});

exports.openPedido = functions.https.onCall((data, context) => {
    if (data && context && context.auth) {
        return pedidoOpen()
            .then(ativos => {
                if (ativos.length === 0) {
                    return createPedido(data);
                } else {
                    return new functions.https.HttpsError('permission-denied', 'Já existe um pedido em aberto', 'Já existe um pedido em aberto');
                }
            });
    } else {
        return new functions.https.HttpsError('unauthenticated', 'Você não tem esta permissão', 'Você não tem esta permissão');
    }
});

exports.closePedido = functions.https.onCall((data, context) => {
    if (data && context && context.auth) {
        return pedidoOpen()
            .then(ativos => {
                if (ativos.length !== 0 && ativos[0].id === data.id) {
                    return closePedido(data);
                } else {
                    return new functions.https.HttpsError('permission-denied', 'Este pedido não está em aberto', 'Este pedido não está em aberto');
                }
            });
    } else {
        return new functions.https.HttpsError('unauthenticated', 'Você não tem esta permissão', 'Você não tem esta permissão');
    }
});

exports.addRefeicao = functions.https.onCall((data, context) => {
    if (data && data.pedido && data.refeicao) {
        return pedidoOpen()
            .then((ativos) => {
                if (ativos.length !== 0 && ativos[0].id === data.pedido.id) {
                    return pedidoAdd(data.pedido, data.refeicao);
                } else {
                    return new functions.https.HttpsError('permission-denied', 'Este pedido já fechou', 'Este pedido já fechou');
                }
            });
    } else {
        return new functions.https.HttpsError("invalid-argument", 'Pedido inválido', 'Pedido inválido');
    }
});

exports.getPedidoOpen = functions.https.onCall(pedidoOpen);

function pedidoAdd(pedido, refeicao) {
    return firestore
        .collection(PEDIDOS)
        .doc(pedido.id)
        .get()
        .then(p => {
            let r = p.data().refeicoes;
            r.push(refeicao);
            return p.ref.update({ refeicoes: r });
        })
}

function pedidoOpen() {
    return firestore
        .collection(PEDIDOS)
        .where('isActive', '==', true)
        .get()
        .then(querySnapshot => {
            let arr = [];
            querySnapshot.forEach(doc => arr.push(doc.data()));
            return arr;
        });
}

function createPedido(data) {
    const id = firestore.collection('_').doc().id
    data.id = id;
    data.isActive = true;
    return firestore
        .collection(PEDIDOS)
        .doc(id)
        .set(data);
}

function closePedido(data) {
    return firestore
        .collection(PEDIDOS)
        .doc(data.id)
        .update({ isActive: false, closedAt: data.closedAt });
}

