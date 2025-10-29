import React, { useEffect } from 'react';
import { Article, Mouvement } from '../types';
import {
  Card,
  CardBody,
  CardHeader,
  Typography,
  Alert,
  Progress,
  Chip,
} from "@material-tailwind/react";
import {
  ChartBarIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardProps {
  articles: Article[];
  mouvements: Mouvement[];
  articlesWithAlerts: Article[];
  onRefreshData?: () => Promise<void>;
}

export function Dashboard({ articles, mouvements, articlesWithAlerts, onRefreshData }: DashboardProps) {
  useEffect(() => {
    if (onRefreshData) {
      onRefreshData();
    }
  }, []);

  const recentMouvements = mouvements
    .sort((a, b) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime())
    .slice(0, 10);

  const totalArticles = articles.length;
  const totalStock = articles.reduce((sum, article) => sum + (article.quantite_stock || 0), 0);
  const entreesDuJour = mouvements.filter(m => 
    m.type === 'ENTREE' && 
    new Date(m.dateHeure).toDateString() === new Date().toDateString()
  ).length;
  const sortiesDuJour = mouvements.filter(m => 
    m.type === 'SORTIE' && 
    new Date(m.dateHeure).toDateString() === new Date().toDateString()
  ).length;

  const categoriesStats = articles.reduce((acc, article) => {
    acc[article.categorie] = (acc[article.categorie] || 0) + (article.quantite_stock || 0);
    return acc;
  }, {} as Record<string, number>);

  const statsCards = [
    {
      title: "Total Articles",
      value: totalArticles.toString(),
      icon: CubeIcon,
      color: "blue" as const,
    },
    {
      title: "Stock Total",
      value: totalStock.toString(),
      icon: ChartBarIcon,
      color: "green" as const,
    },
    {
      title: "Entrées Aujourd'hui",
      value: entreesDuJour.toString(),
      icon: ArrowTrendingUpIcon,
      color: "teal" as const,
    },
    {
      title: "Sorties Aujourd'hui",
      value: sortiesDuJour.toString(),
      icon: ArrowTrendingDownIcon,
      color: "orange" as const,
    },
  ];

  return (
    <div className="w-full max-w-full">
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <Typography variant="h3" color="blue-gray" className="mb-2 text-xl md:text-3xl">
            Tableau de bord
          </Typography>
          <Typography variant="lead" color="gray" className="text-sm md:text-base">
            Vue d'ensemble de votre stock télécoms
          </Typography>
        </div>

        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          {statsCards.map((card, index) => (
            <Card key={index} className="shadow-sm border border-blue-gray-50 w-full overflow-hidden">
              <CardBody className="p-4 md:p-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <Typography variant="small" className="font-normal text-blue-gray-600 text-xs md:text-sm truncate">
                      {card.title}
                    </Typography>
                    <div className={`p-2 rounded-lg bg-${card.color}-50 flex-shrink-0`}>
                      <card.icon className={`w-5 h-5 md:w-6 md:h-6 text-${card.color}-500`} />
                    </div>
                  </div>
                  <Typography variant="h4" color="blue-gray" className="text-xl md:text-2xl font-bold">
                    {card.value}
                  </Typography>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Alertes Stock */}
          <Card className="shadow-sm border border-blue-gray-50 overflow-hidden">
          <CardHeader floated={false} shadow={false} className="rounded-none">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
              <Typography variant="h6" color="blue-gray">
                Alertes Stock
              </Typography>
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            {articlesWithAlerts.length === 0 ? (
              <Typography variant="small" className="text-center py-8 text-blue-gray-500">
                Aucune alerte stock
              </Typography>
            ) : (
              <div className="space-y-4">
                {articlesWithAlerts.slice(0, 5).map(article => (
                  <Alert
                    key={article.id}
                    color="orange"
                    variant="ghost"
                    className="py-3"
                    icon={<ExclamationTriangleIcon className="w-4 h-4" />}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <Typography variant="small" className="font-medium">
                          {article.nom}
                        </Typography>
                        <Typography variant="small" className="text-orange-700">
                          {article.categorie}
                        </Typography>
                      </div>
                      <Chip
                        value={`${article.quantite_stock} / ${article.seuil_minimum}`}
                        variant="ghost"
                        color="orange"
                        size="sm"
                      />
                    </div>
                  </Alert>
                ))}
                {articlesWithAlerts.length > 5 && (
                  <Typography variant="small" className="text-center text-blue-gray-500">
                    +{articlesWithAlerts.length - 5} autres alertes
                  </Typography>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Stock par Catégorie */}
        <Card className="shadow-sm border border-blue-gray-50">
          <CardHeader floated={false} shadow={false} className="rounded-none">
            <Typography variant="h6" color="blue-gray" className="mb-2">
              Stock par Catégorie
            </Typography>
          </CardHeader>
          <CardBody className="px-6 pb-6">
            <div className="space-y-4">
              {Object.entries(categoriesStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6)
                .map(([categorie, quantite]) => {
                  const maxQuantite = Math.max(...Object.values(categoriesStats));
                  const percentage = (quantite / maxQuantite) * 100;
                  
                  return (
                    <div key={categorie}>
                      <div className="flex justify-between mb-1">
                        <Typography variant="small" className="font-medium text-blue-gray-600">
                          {categorie}
                        </Typography>
                        <Typography variant="small" className="font-medium text-blue-gray-900">
                          {quantite}
                        </Typography>
                      </div>
                      <Progress value={percentage} color="blue" className="h-2" />
                    </div>
                  );
                })}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Derniers Mouvements */}
      <Card className="shadow-sm border border-blue-gray-50">
        <CardHeader floated={false} shadow={false} className="rounded-none">
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="w-5 h-5 text-blue-500" />
            <Typography variant="h6" color="blue-gray">
              Derniers Mouvements
            </Typography>
          </div>
        </CardHeader>
        <CardBody className="px-0 pb-0">
          {recentMouvements.length === 0 ? (
            <Typography variant="small" className="text-center py-8 text-blue-gray-500">
              Aucun mouvement enregistré
            </Typography>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max table-auto text-left">
                <thead>
                  <tr>
                    <th className="border-b border-blue-gray-50 py-3 px-6">
                      <Typography variant="small" className="font-normal leading-none text-blue-gray-400">
                        Date
                      </Typography>
                    </th>
                    <th className="border-b border-blue-gray-50 py-3 px-6">
                      <Typography variant="small" className="font-normal leading-none text-blue-gray-400">
                        Type
                      </Typography>
                    </th>
                    <th className="border-b border-blue-gray-50 py-3 px-6">
                      <Typography variant="small" className="font-normal leading-none text-blue-gray-400">
                        Article
                      </Typography>
                    </th>
                    <th className="border-b border-blue-gray-50 py-3 px-6">
                      <Typography variant="small" className="font-normal leading-none text-blue-gray-400">
                        Quantité
                      </Typography>
                    </th>
                    <th className="border-b border-blue-gray-50 py-3 px-6">
                      <Typography variant="small" className="font-normal leading-none text-blue-gray-400">
                        Utilisateur
                      </Typography>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentMouvements.map((mouvement, index) => {
                    const article = mouvement.article;
                    const isLast = index === recentMouvements.length - 1;
                    const classes = isLast ? "py-3 px-6" : "py-3 px-6 border-b border-blue-gray-50";
                    
                    return (
                      <tr key={mouvement.id} className="hover:bg-blue-gray-50/50">
                        <td className={classes}>
                          <Typography variant="small" className="font-normal text-blue-gray-600">
                            {format(new Date(mouvement.dateHeure), 'dd/MM HH:mm', { locale: fr })}
                          </Typography>
                        </td>
                        <td className={classes}>
                          <Chip
                            size="sm"
                            variant="ghost"
                            value={mouvement.type}
                            color={mouvement.type === 'ENTREE' ? 'green' : 'orange'}
                          />
                        </td>
                        <td className={classes}>
                          <Typography variant="small" className="font-normal text-blue-gray-600">
                            {article?.nom || 'Article supprimé'}
                          </Typography>
                        </td>
                        <td className={classes}>
                          <Typography variant="small" className="font-medium text-blue-gray-900">
                            {mouvement.quantite}
                          </Typography>
                        </td>
                        <td className={classes}>
                          <Typography variant="small" className="font-normal text-blue-gray-600">
                            {mouvement.utilisateur}
                          </Typography>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
      </div>
    </div>
  );
}