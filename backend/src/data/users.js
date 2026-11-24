// Dades en memòria: es perden en reiniciar el servidor
// Cada usuari: { id, email, username, passwordStored }
export const users = [];

// Dades de l'usuari que es poden enviar al client
export function toPublicUser(user) {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        passwordStored: user.passwordStored
    };
}
