"""Generate complete, executable synthetic project notebooks; no external datasets."""
from pathlib import Path
import nbformat as n
ROOT=Path(__file__).resolve().parents[1]
def write(name,cells):
    book=n.v4.new_notebook(cells=[n.v4.new_markdown_cell(s) if kind=='md' else n.v4.new_code_cell(s) for kind,s in cells])
    book.metadata.kernelspec=dict(display_name='Python 3',language='python',name='python3')
    n.write(book,ROOT/'public/curriculum'/f'{name}.ipynb')
write('C03',[
('md','''# C03. Качество потока кадров
Авторский синтетический эксперимент. Единица наблюдения — устройство за день. `expected` — ожидаемые кадры, `received` — доставленные, `good` — годные среди доставленных. Время — условные дни 1 и 2. Реальных данных нет.

Запуск: установите зависимости из `requirements-projects.txt`, откройте notebook, выполните **Restart + Run All**. Доставка = сумма received / сумма expected. Качество = сумма good / сумма received только для строк с известным good; охват показываем отдельно. На нулевом знаменателе — NaN. Это два разных вопроса.'''),
('code','''import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
print({'python':sys.version.split()[0], 'numpy':np.__version__, 'pandas':pd.__version__})
raw = pd.DataFrame([
    ('a',1,900,900,810), ('b',1,100,50,25),
    ('a',2,100,100,90), ('b',2,900,450,225),
    ('c',1,100,50,np.nan), ('c',2,100,0,np.nan)
], columns=['device','day','expected','received','good'])
raw'''),
('code','''def analyze(raw):
    df=raw.copy()
    assert not df.duplicated(['device','day']).any()
    assert (df['expected']>0).all()
    assert ((df['received']>=0)&(df['received']<=df['expected'])).all()
    known=df['good'].notna()
    assert ((df.loc[known,'good']>=0)&(df.loc[known,'good']<=df.loc[known,'received'])).all()
    df['delivery']=df['received']/df['expected']
    df['quality']=df['good']/df['received'].replace(0,np.nan)
    summaries=[]
    for day,g in df.groupby('day'):
        k=g['good'].notna()
        denominator=g.loc[k,'received'].sum()
        received=g['received'].sum()
        summaries.append(dict(day=day,delivery=received/g['expected'].sum(),
            quality=g.loc[k,'good'].sum()/denominator if denominator else np.nan,
            quality_coverage=denominator/received if received else np.nan))
    return df,pd.DataFrame(summaries).set_index('day')
rows,summary=analyze(raw)
assert raw.shape==(6,5)
assert rows['quality'].isna().sum()==2
pd.testing.assert_frame_equal(summary,analyze(raw)[1])
summary'''),
('code','''fig,axes=plt.subplots(1,2,figsize=(11,4),sharey=True)
for device,g in rows.groupby('device'):
    axes[0].plot(g['day'],g['delivery'],marker='o',label=device)
    axes[1].plot(g['day'],g['quality'],marker='o',label=device)
for ax,title in zip(axes,['Доставка / ожидаемые кадры','Годные / полученные кадры']):
    ax.set(title=title,xlabel='День',ylabel='Доля',ylim=(0,1.05),xticks=[1,2])
    ax.legend(title='Устройство');ax.grid(alpha=.2)
fig.tight_layout()
plt.show()'''),
('code','''for day,row in summary.iterrows():
    print(f"День {day}: доставка {row.delivery:.1%}; качество {row.quality:.1%}; охват качества {row.quality_coverage:.1%}")
# У a и b показатели не изменились. Меняется доля их кадров.
for device in ['a','b']:
    g=rows[rows.device==device]
    assert g.delivery.nunique()==1 and g.quality.nunique()==1'''),
('md','''## Вывод и самостоятельная часть
В синтетических данных показатели a и b постоянны, но общий результат меняется вместе с составом. У c качество неизвестно: нулевая доставка во второй день не даёт оценки качества полученных кадров. Это наблюдение о данном наборе, не доказательство причины изменения реального потока.

1. Измените ожидаемые объёмы a и b, сохраняя их доли доставки и качества. Повторите все ячейки.
2. Добавьте пропуск good у a: как меняются охват и смысл общего качества?
3. Сохраните HTML-отчёт и объясните числители, знаменатели и ограничения. Проверьте, что все числа текста получены из summary, а не переписаны вручную.''')])
write('C04',[
('md','''# C04. Групповая утечка: проверка процедуры
Синтетические кадры 30 роликов, 12 кадров на ролик. Признаки — числовой сигнал, смещение источника и шум; цель бинарная. Финальный test фиксирован заранее: ролики 24…29. Подбор ведётся только на оставшихся роликах.

Сравним validation по кадрам и по роликам. Высокая оценка сама по себе не доказывает корректность. Запуск: зависимости из `requirements-projects.txt`, затем Restart + Run All. Полноценный PyTorch не требуется.'''),
('code','''import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, GroupShuffleSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score
rng=np.random.default_rng(7)
groups=np.repeat(np.arange(30),12)
source_bias=rng.normal(size=30)
signal=rng.normal(size=len(groups))
X=np.column_stack([signal,source_bias[groups],rng.normal(size=len(groups))])
y=(signal+source_bias[groups]+rng.normal(scale=.5,size=len(groups))>0).astype(int)
final_mask=groups>=24
X_dev,y_dev,g_dev=X[~final_mask],y[~final_mask],groups[~final_mask]
X_test,y_test,g_test=X[final_mask],y[final_mask],groups[final_mask]
assert not set(g_dev)&set(g_test)
assert X_dev.shape[1]==3'''),
('code','''frame_train,frame_valid=train_test_split(np.arange(len(y_dev)),test_size=.25,random_state=13,stratify=y_dev)
group_train,group_valid=next(GroupShuffleSplit(n_splits=1,test_size=.25,random_state=13).split(X_dev,y_dev,g_dev))
assert not set(g_dev[group_train])&set(g_dev[group_valid])
assert not set(g_dev[group_valid])&set(g_test)
print('Общие ролики при кадровом split:',sorted(set(g_dev[frame_train])&set(g_dev[frame_valid])))
print('Общие ролики при групповом split:',sorted(set(g_dev[group_train])&set(g_dev[group_valid])))'''),
('code','''def metrics(y,pred):
    return dict(accuracy=accuracy_score(y,pred),precision=precision_score(y,pred,zero_division=0),recall=recall_score(y,pred,zero_division=0))
# В этом notebook precision/recall при нулевом знаменателе = 0 (явное соглашение).
results=[]
for split,(train,valid) in {'frames':(frame_train,frame_valid),'groups':(group_train,group_valid)}.items():
    baseline=DummyClassifier(strategy='most_frequent').fit(X_dev[train],y_dev[train])
    results.append(dict(split=split,model='baseline',**metrics(y_dev[valid],baseline.predict(X_dev[valid]))))
    for c in [.1,1.,10.]:
        model=make_pipeline(StandardScaler(),LogisticRegression(C=c,random_state=0,max_iter=1000))
        model.fit(X_dev[train],y_dev[train])
        # scaler обучен только по train этого разбиения.
        np.testing.assert_allclose(model[0].mean_,X_dev[train].mean(axis=0))
        results.append(dict(split=split,model=f'C={c}',C=c,**metrics(y_dev[valid],model.predict(X_dev[valid]))))
table=pd.DataFrame(results)
table'''),
('code','''# Выбираем C по recall группового validation; равенство решает меньший C.
candidates=table[(table.split=='groups')&table.C.notna()]
best=candidates.sort_values(['recall','C'],ascending=[False,True]).iloc[0]
chosen=float(best.C)
final=make_pipeline(StandardScaler(),LogisticRegression(C=chosen,random_state=0,max_iter=1000)).fit(X_dev,y_dev)
final_baseline=DummyClassifier(strategy='most_frequent').fit(X_dev,y_dev)
final_table=pd.DataFrame([
    dict(model='baseline',**metrics(y_test,final_baseline.predict(X_test))),
    dict(model=f'Pipeline C={chosen}',**metrics(y_test,final.predict(X_test)))
])
final_table'''),
('md','''## Разбор и самостоятельная часть
Параметр выбран по групповому validation, затем модель обучена на всей development-части. Финальный test использован только после выбора. Повторный подбор по финальной таблице нарушил бы этот порядок.

1. Объясните разницу между общими роликами и общими кадрами.
2. Измените random_state разбиения development-части, сохранив финальные ролики. Оцените устойчивость выбора без подбора под test.
3. Укажите, какие признаки были бы доступны в момент реального предсказания. Синтетический смещённый признак не является обоснованным реальным датчиком.
4. Напишите вывод с числами из таблицы, но не обещайте, что групповой split обязательно даёт меньшую оценку. Здесь проверяется отсутствие утечки и воспроизводимость процедуры.

Источник: https://scikit-learn.org/stable/common_pitfalls.html''')])
print('Generated C03.ipynb and C04.ipynb')
