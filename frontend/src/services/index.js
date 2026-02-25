import axios from "axios";
import {auth} from "../config/firebase";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/",

    timeout: 60000,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
        // Pega o token atualizado do usuário logado
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});