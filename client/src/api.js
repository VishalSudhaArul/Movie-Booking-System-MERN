import axios from "axios";

const API = axios.create({
  baseURL: axios.get(`${process.env.REACT_APP_API_URL}/api/movies`)

});

export default API;
