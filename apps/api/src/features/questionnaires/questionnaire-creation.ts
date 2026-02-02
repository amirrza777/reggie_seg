import {Router} from 'express';
import crypto from 'crypto';
import { prisma } from '../../shared/db.js';

const router = Router();


router.post('/', async (req, res) => {
    const {templateName, questions} = req.body;

    if (!templateName || !Array.isArray(questions)) {
        return res.status(400).json({error: 'Invalid request body'});
    }

    try {
        const template = await prisma.questionnaireTemplate.create({
            data: {
                templateName,
                questions: {
                    create: questions.map((q: any, index: number) => ({
                        label: q.text,
                        type: q.type,
                        order: index,
                        configs: q.configs ?? null
                    }) )
                        }
            }
        });
           
        res.json({ok:true, templateID: template.id});
    }catch(error){
        console.error('Error creating questionnaire template:', error);
        res.status(500).json({error: 'Internal server error'});
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);

    if(isNaN(id)){
        return res.status(400).json({error: 'Invalid template ID'});
    }
    const template = await prisma.questionnaireTemplate.findUnique({
        where: {id},
        include: {questions: {orderBy: {order: 'asc'}}}
    });

    if(!template){
        return res.status(404).json({error: 'Template wasnt found'});
    }

    res.json(
        template
    );
});

export default router;