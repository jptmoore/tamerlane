import { searchAnnotations } from './search';
import * as resource from './resource';
import { Maniiifest } from 'maniiifest';
import { TamerlaneResourceError } from '../errors';

// Mock the dependencies
jest.mock('./resource');
jest.mock('maniiifest');
jest.mock('../config/appConfig.ts', () => ({
  maxSearchPages: 2, // Limit for testing
}));

const mockFetchResource = resource.fetchResource as jest.Mock;
const mockManiiifest = Maniiifest as jest.Mock;

describe('searchAnnotations', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console output for clean test results
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  const MOCK_URL = 'https://example.com/annotations.json';

  it('should fetch and process a single page of annotations correctly', async () => {
    // Arrange: Mock data for a single annotation page
    const mockAnnotationPage = {
      type: 'AnnotationPage',
      id: MOCK_URL,
      items: [
        { id: 'http://example.org/anno/1', type: 'Annotation', target: { id: 'http://example.org/canvas/1' } },
      ],
      annotations: [
        {
          type: 'AnnotationPage',
          items: [
            {
              id: 'http://example.org/anno/2',
              type: 'Annotation',
              motivation: 'commenting',
              target: {
                source: 'http://example.org/anno/1',
                selector: [
                  {
                    type: 'TextQuoteSelector',
                    prefix: '... for a ',
                    exact: 'test',
                    suffix: ' case ...',
                  },
                ],
              },
            },
          ],
        },
      ],
      next: null, // No next page
    };

    mockFetchResource.mockResolvedValue({
      type: 'AnnotationPage',
      data: mockAnnotationPage,
    });

    // Mock Maniiifest behavior
    mockManiiifest.mockImplementation((data, type) => {
      if (type === 'AnnotationPage' && data.id === MOCK_URL) { // Top-level page
        return {
          iterateAnnotationPageAnnotation: () => mockAnnotationPage.items,
          getAnnotationPage: () => ({ next: null }),
        };
      }
      if (type === 'AnnotationPage' && data.items) { // Nested page
        return {
          iterateAnnotationPageAnnotation: () => data.items,
        };
      }
      return { // Default mock
          iterateAnnotationPageAnnotation: () => [],
          getAnnotationPage: () => ({ next: null }),
      };
    });


    // Act
    const snippets = await searchAnnotations(MOCK_URL);

    // Assert
    expect(mockFetchResource).toHaveBeenCalledWith(MOCK_URL);
    expect(mockFetchResource).toHaveBeenCalledTimes(1);
    expect(snippets).toHaveLength(1);
    expect(snippets[0]).toEqual({
      id: 'http://example.org/anno/2',
      annotationId: 'http://example.org/anno/1',
      motivation: 'commenting',
      prefix: '... for a ',
      exact: 'test',
      suffix: ' case ...',
      canvasTarget: 'http://example.org/canvas/1',
      partOf: undefined,
      language: undefined,
    });
  });

  it('should throw TamerlaneResourceError for invalid resource type', async () => {
    // Arrange
    mockFetchResource.mockResolvedValue({
      type: 'Manifest', // Invalid type
      data: {},
    });

    // Act & Assert
    await expect(searchAnnotations(MOCK_URL)).rejects.toThrow(TamerlaneResourceError);
    await expect(searchAnnotations(MOCK_URL)).rejects.toThrow(
      `Invalid or empty response received from ${MOCK_URL}`
    );
  });

  it('should handle multiple pages of annotations', async () => {
        // Arrange
        const MOCK_URL_PAGE1 = 'https://example.com/page1.json';
        const MOCK_URL_PAGE2 = 'https://example.com/page2.json';

        const mockPage1 = {
            type: 'AnnotationPage',
            id: MOCK_URL_PAGE1,
            items: [{ id: 'anno1', type: 'Annotation', target: { id: 'canvas1' } }],
            annotations: [{ type: 'AnnotationPage', items: [{ id: 'snippet1', type: 'Annotation', motivation: 'commenting', target: { source: 'anno1', selector: [{ type: 'TextQuoteSelector', exact: 'text1' }] } }] }],
            next: MOCK_URL_PAGE2,
        };

        const mockPage2 = {
            type: 'AnnotationPage',
            id: MOCK_URL_PAGE2,
            items: [{ id: 'anno2', type: 'Annotation', target: { id: 'canvas2' } }],
            annotations: [{ type: 'AnnotationPage', items: [{ id: 'snippet2', type: 'Annotation', motivation: 'commenting', target: { source: 'anno2', selector: [{ type: 'TextQuoteSelector', exact: 'text2' }] } }] }],
            next: null,
        };

        mockFetchResource
            .mockResolvedValueOnce({ type: 'AnnotationPage', data: mockPage1 })
            .mockResolvedValueOnce({ type: 'AnnotationPage', data: mockPage2 });

        mockManiiifest.mockImplementation((data) => {
            if (data.id === MOCK_URL_PAGE1) {
                return {
                    iterateAnnotationPageAnnotation: () => mockPage1.items,
                    getAnnotationPage: () => ({ next: mockPage1.next }),
                };
            }
            if (data.id === MOCK_URL_PAGE2) {
                return {
                    iterateAnnotationPageAnnotation: () => mockPage2.items,
                    getAnnotationPage: () => ({ next: mockPage2.next }),
                };
            }
             if (data.items) { // Nested page
                return {
                    iterateAnnotationPageAnnotation: () => data.items,
                };
            }
            return { iterateAnnotationPageAnnotation: () => [], getAnnotationPage: () => ({ next: null }) };
        });

        // Act
        const snippets = await searchAnnotations(MOCK_URL_PAGE1);

        // Assert
        expect(mockFetchResource).toHaveBeenCalledTimes(2);
        expect(mockFetchResource).toHaveBeenCalledWith(MOCK_URL_PAGE1);
        expect(mockFetchResource).toHaveBeenCalledWith(MOCK_URL_PAGE2);
        expect(snippets).toHaveLength(2);
        expect(snippets[0].exact).toBe('text1');
        expect(snippets[1].exact).toBe('text2');
    });

});
