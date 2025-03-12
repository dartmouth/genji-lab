// src/hooks/useApi.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosRequestConfig, AxiosInstance, AxiosError } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

interface ApiResponse<T> {
  data: T;
  loading: boolean;
  error: AxiosError | null;
}

interface ApiClient<T> extends ApiResponse<T> {
  // Method overloads for get
  get(options?: AxiosRequestConfig): Promise<void>;
  get(endpoint: string, options?: AxiosRequestConfig): Promise<void>;
  
  // Method overloads for post
  post<R = unknown>(payload: R, options?: AxiosRequestConfig): Promise<void>;
  post<R = unknown>(endpoint: string, payload: R, options?: AxiosRequestConfig): Promise<void>;
  
  // Method overloads for put
  put<R = unknown>(payload: R, options?: AxiosRequestConfig): Promise<void>;
  put<R = unknown>(endpoint: string, payload: R, options?: AxiosRequestConfig): Promise<void>;
  
  // Method overloads for patch
  patch<R = unknown>(payload: R, options?: AxiosRequestConfig): Promise<void>;
  patch<R = unknown>(endpoint: string, payload: R, options?: AxiosRequestConfig): Promise<void>;
  
  // Method overloads for delete
  delete(options?: AxiosRequestConfig): Promise<void>;
  delete(endpoint: string, options?: AxiosRequestConfig): Promise<void>;
  
  // Refresh method
  refresh(): Promise<void>;
}

// Enhanced hook with method overloads
export function useApiClient<T>(
  initialEndpoint?: string, 
  initialOptions: AxiosRequestConfig = {}
): ApiClient<T> {
  const [data, setData] = useState<T>(() => {return [] as T});
  const [loading, setLoading] = useState<boolean>(initialEndpoint ? true : false);
  const [error, setError] = useState<AxiosError | null>(null);
  const [endpoint, setEndpoint] = useState<string | undefined>(initialEndpoint);
  const [options, setOptions] = useState<AxiosRequestConfig>(initialOptions);
  
  // Create a single AbortController for component lifecycle
  const abortControllerRef = useRef<AbortController>(new AbortController());
  
  // Helper function to execute requests
  const executeRequest = useCallback(async <R = unknown>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    requestEndpoint: string | undefined,
    payload?: R,
    requestOptions?: AxiosRequestConfig
  ): Promise<void> => {
    const targetEndpoint = requestEndpoint || endpoint;
    if (!targetEndpoint) {
      throw new Error('No endpoint specified');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const mergedOptions = {
        ...options,
        ...requestOptions,
        signal: abortControllerRef.current.signal
      };
      
      let response;
      
      if (method === 'get' || method === 'delete') {
        response = await api[method]<T>(targetEndpoint, mergedOptions);
      } else {
        response = await api[method]<T>(targetEndpoint, payload, mergedOptions);
      }
      
      setData(response.data);
      
      // Update stored endpoint if a new one was used
      if (requestEndpoint && requestEndpoint !== endpoint) {
        setEndpoint(requestEndpoint);
      }
      
      // Update stored options if new ones were used
      if (requestOptions) {
        setOptions(prev => ({ ...prev, ...requestOptions }));
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        setError(err as AxiosError);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);
  
  // Implementation of get with overloads
  const get = useCallback(
    (endpointOrOptions?: string | AxiosRequestConfig, maybeOptions?: AxiosRequestConfig): Promise<void> => {
      if (typeof endpointOrOptions === 'string') {
        // First overload: endpoint provided
        return executeRequest('get', endpointOrOptions, undefined, maybeOptions);
      } else {
        // Second overload: using current endpoint
        return executeRequest('get', undefined, undefined, endpointOrOptions);
      }
    },
    [executeRequest]
  );
  
  // Implementation of post with overloads
  const post = useCallback(
    <R = unknown>(
      endpointOrPayload: string | R,
      payloadOrOptions?: R | AxiosRequestConfig,
      maybeOptions?: AxiosRequestConfig
    ): Promise<void> => {
      if (typeof endpointOrPayload === 'string') {
        // First overload: endpoint provided
        return executeRequest('post', endpointOrPayload, payloadOrOptions as R, maybeOptions);
      } else {
        // Second overload: using current endpoint
        return executeRequest('post', undefined, endpointOrPayload, payloadOrOptions as AxiosRequestConfig);
      }
    },
    [executeRequest]
  );
  
  // Implementation of put with overloads
  const put = useCallback(
    <R = unknown>(
      endpointOrPayload: string | R,
      payloadOrOptions?: R | AxiosRequestConfig,
      maybeOptions?: AxiosRequestConfig
    ): Promise<void> => {
      if (typeof endpointOrPayload === 'string') {
        // First overload: endpoint provided
        return executeRequest('put', endpointOrPayload, payloadOrOptions as R, maybeOptions);
      } else {
        // Second overload: using current endpoint
        return executeRequest('put', undefined, endpointOrPayload, payloadOrOptions as AxiosRequestConfig);
      }
    },
    [executeRequest]
  );
  
  // Implementation of patch with overloads
  const patch = useCallback(
    <R = unknown>(
      endpointOrPayload: string | R,
      payloadOrOptions?: R | AxiosRequestConfig,
      maybeOptions?: AxiosRequestConfig
    ): Promise<void> => {
      if (typeof endpointOrPayload === 'string') {
        // First overload: endpoint provided
        return executeRequest('patch', endpointOrPayload, payloadOrOptions as R, maybeOptions);
      } else {
        // Second overload: using current endpoint
        return executeRequest('patch', undefined, endpointOrPayload, payloadOrOptions as AxiosRequestConfig);
      }
    },
    [executeRequest]
  );
  
  // Implementation of delete with overloads
  const del = useCallback(
    (endpointOrOptions?: string | AxiosRequestConfig, maybeOptions?: AxiosRequestConfig): Promise<void> => {
      if (typeof endpointOrOptions === 'string') {
        // First overload: endpoint provided
        return executeRequest('delete', endpointOrOptions, undefined, maybeOptions);
      } else {
        // Second overload: using current endpoint
        return executeRequest('delete', undefined, undefined, endpointOrOptions);
      }
    },
    [executeRequest]
  );
  
  // Refresh function to re-fetch current endpoint
  const refresh = useCallback((): Promise<void> => {
    if (!endpoint) {
      throw new Error('Cannot refresh without an endpoint');
    }
    return executeRequest('get', undefined, undefined, options);
  }, [executeRequest, endpoint, options]);
  
  // Initial data fetch if endpoint is provided
  const initialFetchDoneRef = useRef(false);
  
  useEffect(() => {
    if (initialEndpoint && !initialFetchDoneRef.current) {
      get(initialEndpoint, initialOptions);
      initialFetchDoneRef.current = true;
    }
    
    // Create a new AbortController for this component instance
    abortControllerRef.current = new AbortController();
    
    // Cleanup function
    return () => {
      abortControllerRef.current.abort();
    };
  }, [initialEndpoint, initialOptions, get]);
  
  return {
    data,
    loading,
    error,
    get,
    post,
    put,
    patch,
    delete: del,
    refresh
  };
}

// Extended API client for direct use
interface ExtendedApiClient extends AxiosInstance {
  getById: <T>(endpoint: string, id: string | number, options?: AxiosRequestConfig) => Promise<T>;
}

const extendedApi = api as ExtendedApiClient;

extendedApi.getById = async <T>(
  endpoint: string, 
  id: string | number, 
  options?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.get<T>(`${endpoint}/${id}`, options);
  return response.data;
};

export { extendedApi as api };