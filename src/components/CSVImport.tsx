import { useState, useRef } from 'react';
import {
    FileUp,
    Download,
    AlertCircle,
    CheckCircle2,
    X,
    Loader2,
    ChevronRight,
    ClipboardList
} from 'lucide-react';
import { Article } from '../types';

interface CSVImportProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (articles: Omit<Article, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
    fournisseurs?: Array<{ id: string; nom: string }>;
    addNotification?: (notification: { type: 'success' | 'warning' | 'info' | 'error' | 'creation' | 'deletion'; title: string; message: string }) => void;
}

interface ParsedRow {
    data: any;
    errors: string[];
    isValid: boolean;
}

const REQUIRED_HEADERS = [
    'nom',
    'categorie',
    'fournisseur',
    'localisation',
    'quantite_stock',
    'seuil_minimum',
    'prix_unitaire',
    'code_barres'
];

export function CSVImport({ isOpen, onClose, onImport, addNotification }: CSVImportProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const downloadTemplate = () => {
        const csvContent = REQUIRED_HEADERS.join(',') + '\n' +
            'Modem Huawei HG8245H,Équipements réseau,Huawei,Entrepôt principal,50,10,45.50,HUA-8245-001\n' +
            'Câble Fibre 30m,Câbles et connecteurs,Nexans,Magasin central,100,20,15.99,NEX-FIB-30M';

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'template_import_articles.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFile = (file: File) => {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            addNotification?.({
                type: 'error',
                title: 'Format invalide',
                message: 'Veuillez sélectionner un fichier CSV.'
            });
            return;
        }

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file);
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
            addNotification?.({
                type: 'warning',
                title: 'Fichier vide',
                message: 'Le fichier CSV ne contient pas de données.'
            });
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        // Check missing headers
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            addNotification?.({
                type: 'error',
                title: 'Entêtes manquants',
                message: `Il manque : ${missingHeaders.join(', ')}`
            });
            return;
        }

        const rows: ParsedRow[] = lines.slice(1).map((line) => {
            const values = line.split(',').map(v => v.trim());
            const rowData: any = {};
            headers.forEach((header, i) => {
                rowData[header] = values[i];
            });

            const errors: string[] = [];
            if (!rowData.nom) errors.push('Nom manquant');
            if (!rowData.categorie) errors.push('Catégorie manquante');
            if (!rowData.fournisseur) errors.push('Fournisseur manquant');
            if (!rowData.localisation) errors.push('Localisation manquante');

            const stock = parseInt(rowData.quantite_stock);
            if (isNaN(stock) || stock < 0) errors.push('Stock invalide');

            const seuil = parseInt(rowData.seuil_minimum);
            if (isNaN(seuil) || seuil < 0) errors.push('Seuil invalide');

            const prix = parseFloat(rowData.prix_unitaire);
            if (rowData.prix_unitaire && (isNaN(prix) || prix < 0)) errors.push('Prix invalide');

            return {
                data: rowData,
                errors,
                isValid: errors.length === 0
            };
        });

        setParsedRows(rows);
    };

    const executeImport = async () => {
        const validArticles = parsedRows
            .filter(r => r.isValid)
            .map(r => ({
                nom: r.data.nom,
                categorie: r.data.categorie,
                fournisseur: r.data.fournisseur,
                localisation: r.data.localisation,
                quantite_stock: parseInt(r.data.quantite_stock),
                seuil_minimum: parseInt(r.data.seuil_minimum),
                prix_unitaire: parseFloat(r.data.prix_unitaire) || 0,
                code_barres: r.data.code_barres || '',
            }));

        if (validArticles.length === 0) return;

        setIsImporting(true);
        try {
            await onImport(validArticles);
            addNotification?.({
                type: 'success',
                title: 'Importation réussie',
                message: `${validArticles.length} équipements ont été ajoutés.`
            });
            onClose();
        } catch (error) {
            addNotification?.({
                type: 'error',
                title: 'Erreur d\'importation',
                message: 'Une erreur est survenue lors du traitement.'
            });
        } finally {
            setIsImporting(false);
        }
    };

    const validCount = parsedRows.filter(r => r.isValid).length;
    const invalidCount = parsedRows.filter(r => !r.isValid).length;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-md animate-fade-in" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-gray-800/50 animate-scale-in">

                {/* Header */}
                <div className="px-8 pt-8 pb-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 text-white">
                            <ClipboardList size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                Importation en masse
                            </h2>
                            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Ajoutez plusieurs équipements via CSV</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                        >
                            <Download size={16} strokeWidth={3} />
                            <span>Modèle CSV</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-400 active:scale-90"
                        >
                            <X size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Upload Zone */}
                    {!fileName ? (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files[0];
                                if (file) handleFile(file);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                relative h-64 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300
                ${isDragging
                                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 scale-[0.98]'
                                    : 'border-gray-200 dark:border-gray-800 hover:border-indigo-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'}
              `}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFile(file);
                                }}
                            />
                            <div className="p-5 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-500/10">
                                <FileUp size={48} strokeWidth={1.5} />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-black text-gray-900 dark:text-white">Glissez votre fichier ici</p>
                                <p className="text-sm text-gray-500 font-medium">Ou cliquez pour parcourir vos dossiers</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="glass p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Total lignes</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">{parsedRows.length}</p>
                                </div>
                                <div className="glass p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Prêts à l'import</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">{validCount}</p>
                                </div>
                                <div className="glass p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Lignes en erreur</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">{invalidCount}</p>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                                        <tr>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase text-[10px]">Statut</th>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase text-[10px]">Nom</th>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase text-[10px]">Catégorie</th>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase text-[10px]">Stock</th>
                                            <th className="px-4 py-3 font-black text-gray-500 uppercase text-[10px]">Détails erreurs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {parsedRows.map((row, i) => (
                                            <tr key={i} className={`group ${row.isValid ? 'bg-transparent' : 'bg-rose-50/30 dark:bg-rose-900/10'}`}>
                                                <td className="px-4 py-3">
                                                    {row.isValid ? (
                                                        <CheckCircle2 className="text-emerald-500" size={18} />
                                                    ) : (
                                                        <AlertCircle className="text-rose-500" size={18} />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                                                    {row.data.nom || <span className="text-rose-400 italic font-medium">Manquant</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.data.categorie}</td>
                                                <td className="px-4 py-3 font-mono font-bold text-gray-700 dark:text-gray-300">{row.data.quantite_stock}</td>
                                                <td className="px-4 py-3">
                                                    {row.errors.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {row.errors.map((err, j) => (
                                                                <span key={j} className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-bold">
                                                                    {err}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">Validé</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-center">
                                <button
                                    onClick={() => { setFileName(null); setParsedRows([]); }}
                                    className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Remplacer le fichier
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={executeImport}
                        disabled={validCount === 0 || isImporting}
                        className={`
              flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 group
              ${validCount === 0 || isImporting
                                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none'
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}
            `}
                    >
                        {isImporting ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Importation en cours...</span>
                            </>
                        ) : (
                            <>
                                <span>Importer {validCount} articles</span>
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
