import React, { useState, useEffect, useCallback } from 'react';

import 'katex/dist/katex.min.css';
import DefaultMarkdown from '../Markdown/component';


interface ElementMolarMassProps {
    className?: string;
}

export default function ElementMolarMass({ className = "" }: ElementMolarMassProps) {
    const [element, setElement] = useState('');
    const [molarMass, setMolarMass] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [inputFocused, setInputFocused] = useState(true);

    const fetchElementMolarMass = useCallback(async (elementValue: string) => {
        if (!elementValue.trim()) {
            setMolarMass(null);
            setError(null);
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);
        setMolarMass(null);

        try {
            // Use our proxy API to get molecular weight from webqc.org
            const encodedElement = encodeURIComponent(elementValue.trim());
            const apiUrl = `/api/webqc-proxy?token=${encodedElement}&max_matches=10&use_similar=0`;

            const response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data); // Debug log

            // Parse the response format: [["function1", {t: "C6H12O6 — 180.15588 g/mol [Glucose]"}, ...]]
            if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]) && data[0].length > 1) {
                const resultsArr = data[0].slice(1); // skip "function1"
                setResults(resultsArr);
                // Find the first result whose formula matches the input exactly (case-insensitive)
                const inputFormula = elementValue.trim().toUpperCase();
                let matchedResult = resultsArr.find(
                    (item: any) => typeof item.t === 'string' && item.t.split('—')[0].trim().toUpperCase() === inputFormula
                );
                if (!matchedResult) {
                    matchedResult = resultsArr[0];
                }
                if (matchedResult && typeof matchedResult === 'object' && matchedResult.t) {
                    const resultText = matchedResult.t;
                    const weightMatch = resultText.match(/— ([\d.]+) g\/mol/);
                    if (weightMatch) {
                        setMolarMass(parseFloat(weightMatch[1]));
                    } else {
                        setError(`Could not parse molecular weight from: "${resultText}"`);
                    }
                } else {
                    setError(`No valid results found for "${elementValue}"`);
                }
            } else {
                setResults([]);
                setError(`Unexpected response format or no results found for "${elementValue}"`);
            }
        } catch (err) {
            console.error('Error fetching element molar mass:', err);
            if (err instanceof TypeError && err.message.includes('fetch')) {
                setError('Network error - the API may not be accessible due to CORS restrictions');
            } else {
                setError(`Failed to fetch molar mass: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchElementMolarMass(element);
        }, 20);

        return () => clearTimeout(timeoutId);
    }, [element, fetchElementMolarMass]);

    return (
        <div className={`flex p-2 flex-col gap-2 ${className}`}>
            <text>Find the <strong>molar mass</strong> of any element or compound:</text>
            <div className="flex flex-col focus:outline-2 items-center border rounded-lg ">
                <input
                    type="text"
                    placeholder="Enter compound formula (e.g., H2O, C6H12O6, NaCl)"
                    value={element}
                    onChange={(e) => setElement(e.target.value)}
                    className="w-full p-2 focus:outline-none"
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                />
                {((results.length > 0 && !error && element.length !== 0 && !loading) || element.length === 0 || loading) && (() => {
                    // Show placeholder/filler when no input or while loading
                    if (element.length === 0 || loading) {
                        const placeholderFormula = 'X';
                        const placeholderWeight = 'M';
                        const latexFormula = 'X';
                        const gPerMol = `$$\\small \\cfrac{${placeholderWeight} \\text{ g }${latexFormula}}{1 \\text{ mol } ${latexFormula}}$$`;
                        const molPerG = `$$\\small \\cfrac{1 \\text{ mol } ${latexFormula}}{${placeholderWeight} \\text{ g }${latexFormula}}$$`;
                        return (
                            <div className="rounded flex-1 place-items-center gap-2 flex flex-col p-2 text-gray-400 opacity-70">
                                <div className="flex-1 gap-2 flex place-items-center">
                                    <DefaultMarkdown>{gPerMol}</DefaultMarkdown>
                                    or
                                    <DefaultMarkdown>{molPerG}</DefaultMarkdown>
                                </div>
                                <div className="text-xs text-gray-400">X [Element]</div>
                            </div>
                        );
                    }
                    // Find the first result whose formula matches the input exactly (case-insensitive)
                    const inputFormula = element.trim().toUpperCase();
                    let matchedResult = results.find(
                        (item) => typeof item.t === 'string' && item.t.split('—')[0].trim().toUpperCase() === inputFormula
                    );
                    if (!matchedResult) {
                        matchedResult = results[0];
                    }
                    if (!matchedResult) return null;
                    const resultText = matchedResult.t;
                    const [formula, rest] = resultText.split('—');
                    const weightMatch = resultText.match(/— ([\d.]+) g\/mol/);
                    const nameMatch = resultText.match(/\[(.*?)\]/);
                    const weight = weightMatch ? weightMatch[1] : '?';
                    const name = nameMatch ? nameMatch[1] : '';

                    // Format formula for LaTeX: subscripts for numbers, superscripts for charges
                    let latexFormula = formula.trim();
                    // Subscript all numbers after element symbols (including multi-digit)
                    latexFormula = latexFormula.replace(/([A-Za-z])([0-9]+)/g, '$1_{$2}');
                    // Superscript for charges: look for a digit followed by + or - (optionally repeated)
                    latexFormula = latexFormula.replace(/([0-9])([+-])/, '$1^{ $2 }');
                    // Also handle cases like SO4^2- (common in chemistry)
                    latexFormula = latexFormula.replace(/([A-Za-z]\})\^([0-9]+)([+-])/, '$1^{ $2$3 }');

                    // g/mol and mol/g forms
                    const gPerMol = `$$\\small \\cfrac{${weight} \\text{ g }${latexFormula}}{1 \\text{ mol } ${latexFormula}}$$`;
                    const molPerG = `$$\\small \\cfrac{1 \\text{ mol } ${latexFormula}}{${weight} \\text{ g }${latexFormula}}$$`;

                    return (
                        <div className="rounded flex-1 place-items-center gap-2 flex flex-col p-2 text-gray-700">
                            <div className="flex-1 gap-2 flex place-items-center"><DefaultMarkdown>{gPerMol}</DefaultMarkdown>
                            or
                            <DefaultMarkdown>{molPerG}</DefaultMarkdown>
                            </div>
                            <div className="text-xs text-gray-300">{formula.trim()} {name && (<span className="ml-2 text-gray-400">[{name}]</span>)}</div>
                        </div>
                    );
                })()}

                

            </div>


        </div>
    );
}
