import axios from "axios"

export const fetcher = async (url: string) => {
  try {
    const response = await axios.get(url)
    return response.data
  } catch (error) {
    console.error("Fetcher error:", error)
    throw error
  }
}

export const postFetcher = async (url: string, data: any) => {
  try {
    const response = await axios.post(url, data)
    return response.data
  } catch (error) {
    console.error("Post fetcher error:", error)
    throw error
  }
}

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("auth_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("auth_token")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)
