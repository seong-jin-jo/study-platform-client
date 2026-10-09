import axios from 'axios';

export const axiosInstance = axios.create({ baseURL: '/' });
export const axiosInstanceForMultipart = axios.create({ baseURL: '/' });
export const axiosInstanceV5 = axios.create({ baseURL: '/' });
export const axiosInstanceForMultipartV5 = axios.create({ baseURL: '/' });
export const axiosInstanceV6 = axios.create({ baseURL: '/' });
