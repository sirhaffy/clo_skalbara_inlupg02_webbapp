// API Gateway URL - fetched from backend config endpoint
let API_BASE_URL = null

// Function to get API URL from backend configuration
const getApiBaseUrl = async () => {
    if (API_BASE_URL) {
        console.log('Using cached API base URL:', API_BASE_URL)
        return API_BASE_URL
    }

    try {
        // Get API config from backend (which reads from environment variables)
        console.log('Fetching API config from /api/config...')
        const response = await fetch('/api/config')
        if (response.ok) {
            const config = await response.json()
            API_BASE_URL = config.apiGatewayUrl || config.apiBaseUrl
            console.log('Loaded API base URL from config:', API_BASE_URL)
            return API_BASE_URL
        } else {
            console.warn('Failed to fetch /api/config, status:', response.status)
        }
    } catch (error) {
        console.warn('Failed to fetch API config from backend:', error)
    }

    // Fallback to hardcoded URL (should be avoided in production)
    API_BASE_URL = 'https://vnnab4xh11.execute-api.eu-north-1.amazonaws.com/prod'
    console.warn('Using fallback API URL:', API_BASE_URL)

    return API_BASE_URL
}

class ItemsService {
    async getAllItems() {
        const baseUrl = await getApiBaseUrl()
        const fullUrl = `${baseUrl}/api/items`
        console.log('Fetching items from:', fullUrl)

        const response = await fetch(fullUrl)
        console.log('Response status:', response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Error response:', errorText)
            throw new Error(`Failed to fetch items: ${response.status} - ${errorText}`)
        }
        return response.json()
    }

    async getItem(id) {
        const baseUrl = await getApiBaseUrl()
        const response = await fetch(`${baseUrl}/api/items/${id}`)
        if (!response.ok) {
            throw new Error(`Failed to fetch item: ${response.status}`)
        }
        return response.json()
    }

    async createItem(item) {
        const baseUrl = await getApiBaseUrl()
        const fullUrl = `${baseUrl}/api/items`
        console.log('Creating item at:', fullUrl, 'with data:', item)

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(item),
        })
        console.log('Create response status:', response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Create error response:', errorText)
            throw new Error(`Failed to create item: ${response.status} - ${errorText}`)
        }
        return response.json()
    }

    async updateItem(id, item) {
        const baseUrl = await getApiBaseUrl()
        const response = await fetch(`${baseUrl}/api/items/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(item),
        })
        if (!response.ok) {
            throw new Error(`Failed to update item: ${response.status}`)
        }
        return response.json()
    }

    async deleteItem(id) {
        const baseUrl = await getApiBaseUrl()
        const response = await fetch(`${baseUrl}/api/items/${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) {
            throw new Error(`Failed to delete item: ${response.status}`)
        }
        return response.status === 204
    }
} export default new ItemsService()